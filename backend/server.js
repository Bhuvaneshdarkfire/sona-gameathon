require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Razorpay Instance
const razorpay = new Razorpay({
    key_id: 'YOUR_RAZORPAY_KEY_ID', // Replace with your actual Key ID
    key_secret: 'YOUR_RAZORPAY_KEY_SECRET' // Replace with your actual Key Secret
});

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected'));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// --- SCHEMAS ---
const SettingSchema = new mongoose.Schema({ key: String, value: mongoose.Schema.Types.Mixed });

const TeamSchema = new mongoose.Schema({
    teamName: String,
    institute: String,
    captainName: String,
    captainEmail: { type: String, unique: true },
    members: [String],
    password: { type: String, default: null },
    score: { type: Number, default: 0 },
    role: { type: String, default: 'user' },
    status: { type: String, default: 'Pending' }, 
    editCount: { type: Number, default: 0 },
    maxEdits: { type: Number, default: 2 }
});

const AnnouncementSchema = new mongoose.Schema({
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const Team = mongoose.model('Team', TeamSchema);
const Setting = mongoose.model('Setting', SettingSchema);
const Announcement = mongoose.model('Announcement', AnnouncementSchema);

// --- ROUTES ---

// 1. PUBLIC: Get Settings & Leaderboard
app.get('/api/public/data', async (req, res) => {
    const paymentMode = await Setting.findOne({ key: 'payment_mode' });
    const leaderboard = await Team.find({ role: 'user', status: 'Approved' }).select('teamName institute score').sort({ score: -1 });
    res.json({ paymentEnabled: paymentMode ? paymentMode.value : false, leaderboard });
});

// 2. REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { teamName, institute, captainName, captainEmail } = req.body;
        if (await Team.findOne({ captainEmail })) return res.status(400).json({ error: "Email exists" });
        await Team.create({ teamName, institute, captainName, captainEmail, members: [captainName, "", "", "", "", ""] });
        res.json({ message: "Registration successful!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await Team.findOne({ captainEmail: email });
    if (!user || !user.password) return res.status(400).json({ error: "Invalid credentials or pending approval." });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid Password" });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, role: user.role });
});

// 4. USER: Dashboard Data (Includes Announcements & Payment Info)
app.get('/api/user/dashboard', async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if(!token) return res.status(401).json({error: "No Token"});
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const team = await Team.findById(decoded.id);
        
        // Dynamic Rank
        const allTeams = await Team.find({ role: 'user', status: 'Approved' }).sort({ score: -1 });
        const rank = allTeams.findIndex(t => t._id.toString() === decoded.id) + 1;

        // Fetch Announcements & Settings
        const announcements = await Announcement.find().sort({ timestamp: -1 });
        const paymentMode = await Setting.findOne({ key: 'payment_mode' });
        const paymentAmount = await Setting.findOne({ key: 'payment_amount' });

        res.json({
            team,
            rank,
            announcements,
            payment: {
                enabled: paymentMode?.value || false,
                amount: paymentAmount?.value || 0
            },
            dreamTeam: ["Player A", "Player B", "Player C"] 
        });
    } catch(e) { res.status(401).json({error: "Invalid Token"}); }
});

// 5. USER: Update Members
app.post('/api/user/update-members', async (req, res) => {
    const { token, members } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const team = await Team.findById(decoded.id);
        if (team.editCount >= team.maxEdits) return res.status(400).json({ error: "Edit limit reached." });
        team.members = members;
        team.editCount += 1;
        await team.save();
        res.json({ success: true, editsLeft: team.maxEdits - team.editCount });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. USER: Change Password
app.post('/api/user/change-password', async (req, res) => {
    const { token, oldPassword, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Team.findById(decoded.id);
        if (!(await bcrypt.compare(oldPassword, user.password))) return res.status(400).json({ error: "Wrong old password" });
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 7. ADMIN: Get Data (Teams + Settings + Announcements)
app.get('/api/admin/data', async (req, res) => {
    const teams = await Team.find({ role: 'user' });
    const settings = await Setting.find();
    const announcements = await Announcement.find().sort({ timestamp: -1 });
    res.json({ teams, settings, announcements });
});

// 8. ADMIN: Approve & Email
app.post('/api/admin/approve', async (req, res) => {
    const { teamId } = req.body;
    try {
        const team = await Team.findById(teamId);
        const autoPass = Math.random().toString(36).slice(-8);
        team.password = await bcrypt.hash(autoPass, 10);
        team.status = "Approved";
        await team.save();
        
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: team.captainEmail,
            subject: 'Sona Gameathon Login',
            text: `Approved! Login: http://localhost:5173/login \nEmail: ${team.captainEmail}\nPassword: ${autoPass}`
        });
        res.json({ message: "Approved" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 9. ADMIN: Post Announcement
app.post('/api/admin/announce', async (req, res) => {
    const { message } = req.body;
    await Announcement.create({ message });
    res.json({ success: true });
});

// 10. ADMIN: Settings & Actions
app.post('/api/admin/settings', async (req, res) => {
    const { key, value } = req.body;
    await Setting.findOneAndUpdate({ key }, { value }, { upsert: true });
    res.json({ success: true });
});
// ... existing routes ...

// 11. PAYMENT: Create Order
app.post('/api/payment/order', async (req, res) => {
    const { amount } = req.body;
    try {
        const options = {
            amount: amount * 100, // Razorpay takes amount in paise (multiply by 100)
            currency: "INR",
            receipt: "receipt_" + Math.random().toString(36).substring(7),
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 12. PAYMENT: Verify & Notify Admin
app.post('/api/payment/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, teamId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', 'YOUR_RAZORPAY_KEY_SECRET') // USE YOUR SECRET HERE
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Payment Success!
        const team = await Team.findById(teamId);
        team.status = "Paid"; // Update Status
        await team.save();

        // Optional: Notify Admin via Email that someone paid
        // await transporter.sendMail({ to: 'admin_email@sona.in', subject: 'New Payment Recieved', text: `Team ${team.teamName} has paid!` });

        res.json({ success: true, message: "Payment Verified" });
    } else {
        res.status(400).json({ success: false, error: "Invalid Signature" });
    }
});

app.post('/api/admin/action', async (req, res) => {
    const { action, teamId, value } = req.body;
    if (action === 'kick') await Team.findByIdAndDelete(teamId);
    if (action === 'score') await Team.findByIdAndUpdate(teamId, { score: value });
    res.json({ success: true });
});

app.listen(5000, () => console.log('🚀 Server Ready'));