FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy training data (pre-loaded for all teams)
COPY training_data/deliveries_updated_ipl_upto_2025.csv /app/training_data/deliveries_updated_ipl_upto_2025.csv

# Copy the runner script
COPY runner.py /app/runner.py

# Team's mymodelfile.py will be mounted at /var/mymodelfile.py
# test_file.csv will be mounted at /var/test_file.csv
# submission.csv will be mounted at /var/submission.csv
# logs.txt will be mounted at /var/logs.txt

ENTRYPOINT ["python", "/app/runner.py"]
