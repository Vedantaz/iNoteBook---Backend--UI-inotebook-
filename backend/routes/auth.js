const express = require('express');
const User = require('../models/User');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const res = require('express/lib/response');
const JWT_SECRET = ('VedSupreCod$er');
var fetchuser = require('../middleware/fetchuser');
// console.log(res);

//Route 1:  Create a User using: POST "/api/auth/createuser". Doesn't require Auth , no login required. 
router.post('/createuser', [
    body('name', 'Please enter a valid name').isLength({ min: 3 }),
    body('email', 'Please enter a valid email').isEmail({ min: 8 }),
    body('password', 'Please must enter a valid password of 8 characters').isLength({ min: 8 }),
], async (req, res) => {
    let success = false;
    // there are errors, return bad request and the errors 
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
        // check whether the user exists with this email exists already
        let user = await User.findOne({ email: req.body.email })
        if (user) {
            success = false;
            return res.status(400).json({ success, error: "Sorry a User with this email already exists." })
        }
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        // Create a new user
        user = await User.create({
            name: req.body.name,
            password: secPass,
            email: req.body.email,
        });
        const data = {
            user: {
                id: user.id
            }
        }
        const authtoken = jwt.sign(data, JWT_SECRET);
        // res.json({user})
        success = true;
        res.json({ success, authtoken })
    }
    catch (error) {
        res.status(500).send("Some Error occured");
        console.error(error.message);
    }
})
// Route 2: Authenticate a User using: POST "/api/auth/createuser". login required. 
router.post('/login', [
    body('email', 'Please enter a valid email').isEmail({ min: 5 }),
    body('password', "Password can't be blank").exists().isLength({ min: 5 }),
], async (req, res) => {
    let success = false;
    // if there are errors , return Bad request and the errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        success = false;
        if (!user) {
            let success = false;
            return res.status(404).json({ success, error: "Please try to login with correct credentials." }) // bad request
        }
        const passwordCompare = await bcrypt.compare(password, user.password)
        if (!passwordCompare) {
            success = false;
            return res.status(404).json({ success, error: "Please try to login with correct credentials." })
        }
        const data = {
            user: {
                id: user.id
            }
        }
        const authtoken = jwt.sign(data, JWT_SECRET);
        success = true;
        res.json({ success, authtoken })
    }
    catch (error) {
        res.status(500).send("Internal Server Error");
        console.error(error.message);
    }
})
// Route 3: Gte logged in User details: POST "/api/auth/getuser". login required. 
// authtoken> get data of user
router.post('/getuser', fetchuser, async (req, res) => {
    try {
        let userId = req.user.id;
        const user = await User.findById(userId).select('-password');
        res.send(user)
    }
    catch (error) {
        console.error(error.message);
        res.status(400).send('Internal Server Error.')
    }
})
module.exports = router