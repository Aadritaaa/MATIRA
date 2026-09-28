const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'matira_secret_jwt_key_2026_cse3200';

/**
 * Register a new user (Farmer / Buyer)
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { full_name, phone, email, password, role = 'farmer', district, address } = req.body;

        // Validation
        if (!full_name || !phone || !password || !district) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: full_name, phone, password, and district.'
            });
        }

        const validRoles = ['farmer', 'buyer'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be either "farmer" or "buyer".'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        // Check if phone or email already exists
        const [existingUsers] = await db.query(
            'SELECT id, phone, email FROM users WHERE phone = ? OR (email IS NOT NULL AND email = ?)',
            [phone.trim(), email ? email.trim() : null]
        );

        if (existingUsers.length > 0) {
            const isPhoneMatch = existingUsers.some(u => u.phone === phone.trim());
            return res.status(409).json({
                success: false,
                message: isPhoneMatch 
                    ? 'A user with this phone number already exists.' 
                    : 'A user with this email address already exists.'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert new user
        const [result] = await db.query(
            `INSERT INTO users (full_name, phone, email, password_hash, role, district, address)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                full_name.trim(),
                phone.trim(),
                email && email.trim() !== '' ? email.trim() : null,
                password_hash,
                role,
                district.trim(),
                address ? address.trim() : null
            ]
        );

        const newUserId = result.insertId;

        // Create JWT payload
        const userPayload = {
            id: newUserId,
            full_name: full_name.trim(),
            phone: phone.trim(),
            email: email ? email.trim() : null,
            role,
            district: district.trim()
        };

        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
            success: true,
            message: 'Registration successful!',
            token,
            user: {
                id: newUserId,
                full_name: full_name.trim(),
                phone: phone.trim(),
                email: email ? email.trim() : null,
                role,
                district: district.trim(),
                address: address ? address.trim() : null
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login user (Farmer / Buyer / Admin)
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide phone number/email and password.'
            });
        }

        const cleanIdentifier = identifier.trim();

        // Search user by phone or email
        const [users] = await db.query(
            'SELECT * FROM users WHERE phone = ? OR email = ? LIMIT 1',
            [cleanIdentifier, cleanIdentifier]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials. User not found with provided phone or email.'
            });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials. Incorrect password.'
            });
        }

        // Generate token
        const userPayload = {
            id: user.id,
            full_name: user.full_name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            district: user.district
        };

        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                district: user.district,
                address: user.address
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
    try {
        const [users] = await db.query(
            'SELECT id, full_name, phone, email, role, district, address, created_at FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        return res.status(200).json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getCurrentUser
};
