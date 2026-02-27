// ─── Docker Service ─────────────────────────────────────────────
// Runs team models in a shared Docker container with resource limits.
// New approach: single base image, mount team's mymodelfile.py + test_file.csv.

const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Connect to Docker daemon
const docker = new Docker(
    process.platform === 'win32'
        ? { socketPath: '//./pipe/docker_engine' }
        : { socketPath: '/var/run/docker.sock' }
);

// ─── Configuration ─────────────────────────────────────────────
const BASE_IMAGE = process.env.BASE_DOCKER_IMAGE || 'sonagameathon/base:latest';
const MODELS_DIR = path.join(__dirname, '..', 'uploads', 'models');

const CONTAINER_LIMITS = {
    Memory: 512 * 1024 * 1024,     // 512 MB RAM
    NanoCpus: 1e9,                  // 1 CPU core (single threaded)
    PidsLimit: 100,                 // Max 100 processes
};
const EXECUTION_TIMEOUT_MS = 20000;  // 20 seconds (IITM-style)

/**
 * Test Docker daemon connectivity.
 */
async function pingDocker() {
    try {
        await docker.ping();
        return { connected: true };
    } catch (err) {
        return { connected: false, error: err.message };
    }
}

/**
 * Run a team's model against a test file using the shared base Docker image.
 *
 * Flow:
 *   1. Prepare temp dir with test_file.csv, empty submission.csv, empty logs.txt
 *   2. Mount team's mymodelfile.py + test files into container
 *   3. Run the shared base image (runner.py imports MyModel, runs fit/predict)
 *   4. Read submission.csv for predictions
 *   5. Cleanup
 *
 * @param {string} teamId      — Team identifier (used to find mymodelfile.py)
 * @param {string} testCsvPath — Absolute path to the test_file.csv for this match
 * @returns {Promise<{success, predictions, log, executionTimeMs, error}>}
 */
async function runPrediction(teamId, testCsvPath) {
    const runId = uuidv4().slice(0, 8);
    const tmpDir = path.join(os.tmpdir(), `gameathon-run-${runId}`);
    const startTime = Date.now();
    let container = null;

    try {
        // 1. Validate model file exists
        const modelPath = path.join(MODELS_DIR, teamId, 'mymodelfile.py');
        if (!fs.existsSync(modelPath)) {
            return {
                success: false,
                predictions: [],
                log: 'No mymodelfile.py found for this team.',
                executionTimeMs: 0,
                error: 'MODEL_NOT_FOUND',
            };
        }

        // 2. Prepare temp directory
        fs.mkdirSync(tmpDir, { recursive: true });

        // Copy test file to temp dir (so we have a clean mount point)
        const testFile = path.join(tmpDir, 'test_file.csv');
        fs.copyFileSync(testCsvPath, testFile);

        // Create empty output files
        const submissionFile = path.join(tmpDir, 'submission.csv');
        fs.writeFileSync(submissionFile, 'id,predicted_run\n');

        const logsFile = path.join(tmpDir, 'logs.txt');
        fs.writeFileSync(logsFile, '');

        // 3. Create container with shared base image
        container = await docker.createContainer({
            Image: BASE_IMAGE,
            HostConfig: {
                Memory: CONTAINER_LIMITS.Memory,
                NanoCpus: CONTAINER_LIMITS.NanoCpus,
                PidsLimit: CONTAINER_LIMITS.PidsLimit,
                NetworkMode: 'none',          // No network access
                AutoRemove: false,
                Binds: [
                    `${modelPath}:/var/mymodelfile.py:ro`,    // Team's model (read-only)
                    `${testFile}:/var/test_file.csv:ro`,      // Test data (read-only)
                    `${submissionFile}:/var/submission.csv`,   // Output predictions
                    `${logsFile}:/var/logs.txt`,              // Error logs
                ],
            },
        });

        // 4. Start container
        await container.start();

        // 5. Wait with timeout
        const waitPromise = container.wait();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), EXECUTION_TIMEOUT_MS)
        );

        let exitCode;
        try {
            const result = await Promise.race([waitPromise, timeoutPromise]);
            exitCode = result.StatusCode;
        } catch (timeoutErr) {
            try { await container.kill(); } catch { /* already stopped */ }
            const executionTimeMs = Date.now() - startTime;
            return {
                success: false,
                predictions: [],
                log: `Container exceeded ${EXECUTION_TIMEOUT_MS / 1000}-second timeout and was killed.`,
                executionTimeMs,
                error: 'TIMEOUT',
            };
        }

        const executionTimeMs = Date.now() - startTime;

        // 6. Read logs
        let logContent = '';
        try { logContent = fs.readFileSync(logsFile, 'utf-8'); } catch { }

        // 7. Read submission.csv
        if (exitCode !== 0) {
            return {
                success: false,
                predictions: [],
                log: logContent || `Container exited with code ${exitCode}`,
                executionTimeMs,
                error: `EXIT_CODE_${exitCode}`,
            };
        }

        // Parse submission.csv
        const predictions = parseSubmissionCSV(submissionFile);
        if (predictions.length === 0) {
            return {
                success: false,
                predictions: [],
                log: logContent || 'No predictions found in submission.csv',
                executionTimeMs,
                error: 'EMPTY_SUBMISSION',
            };
        }

        return {
            success: true,
            predictions,
            log: logContent,
            executionTimeMs,
            error: null,
        };
    } catch (err) {
        const executionTimeMs = Date.now() - startTime;
        return {
            success: false,
            predictions: [],
            log: '',
            executionTimeMs,
            error: `Runtime error: ${err.message}`,
        };
    } finally {
        if (container) {
            try { await container.remove({ force: true }); } catch { /* ignore */ }
        }
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
}

/**
 * Parse submission.csv into an array of predictions.
 * Expected format: id, predicted_run
 *
 * @param {string} csvPath - Path to submission.csv
 * @returns {Array<{id: string|number, predicted_run: number}>}
 */
function parseSubmissionCSV(csvPath) {
    try {
        const content = fs.readFileSync(csvPath, 'utf-8').trim();
        const lines = content.split('\n');
        if (lines.length < 2) return []; // Only header or empty

        const header = lines[0].toLowerCase().replace(/\r/g, '');
        const cols = header.split(',').map(c => c.trim());
        const idIdx = cols.indexOf('id');
        const predIdx = cols.indexOf('predicted_run');

        if (idIdx === -1 || predIdx === -1) {
            console.warn('submission.csv missing required columns (id, predicted_run)');
            return [];
        }

        const predictions = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].replace(/\r/g, '').split(',');
            if (row.length <= Math.max(idIdx, predIdx)) continue;

            const id = row[idIdx].trim();
            const predictedRun = parseInt(row[predIdx].trim(), 10);

            if (id && !isNaN(predictedRun)) {
                predictions.push({ id, predicted_run: predictedRun });
            }
        }

        return predictions;
    } catch (err) {
        console.error('Error parsing submission.csv:', err.message);
        return [];
    }
}

/**
 * Build the base Docker image from backend/base-docker/
 */
async function buildBaseImage() {
    const contextPath = path.join(__dirname, '..', 'base-docker');

    if (!fs.existsSync(contextPath)) {
        return { success: false, log: 'base-docker directory not found' };
    }

    return new Promise((resolve) => {
        const tarfs = require('tar-fs');
        const tarStream = tarfs.pack(contextPath);

        docker.buildImage(tarStream, { t: BASE_IMAGE }, (err, stream) => {
            if (err) {
                return resolve({ success: false, log: `Build error: ${err.message}` });
            }

            let buildLog = '';
            stream.on('data', (chunk) => {
                try {
                    const lines = chunk.toString().split('\n').filter(Boolean);
                    for (const line of lines) {
                        const parsed = JSON.parse(line);
                        if (parsed.stream) buildLog += parsed.stream;
                        if (parsed.error) buildLog += `ERROR: ${parsed.error}\n`;
                    }
                } catch {
                    buildLog += chunk.toString();
                }
            });

            stream.on('end', () => {
                const ok = buildLog.includes('Successfully tagged') || buildLog.includes('Successfully built');
                resolve({ success: ok, log: buildLog.slice(-3000) });
            });

            stream.on('error', (e) => {
                resolve({ success: false, log: `Stream error: ${e.message}` });
            });
        });
    });
}

/**
 * Remove a Docker image by tag.
 */
async function removeImage(imageTag) {
    try {
        const image = docker.getImage(imageTag);
        await image.remove({ force: true });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = {
    pingDocker,
    runPrediction,
    buildBaseImage,
    removeImage,
    parseSubmissionCSV,
    EXECUTION_TIMEOUT_MS,
    CONTAINER_LIMITS,
    BASE_IMAGE,
};
