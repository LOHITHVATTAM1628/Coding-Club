const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const { protect, admin } = require('../middleware/authMiddleware');

// @route   GET /api/resources
// @desc    Get all resources
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const resources = await Resource.find().sort({ createdAt: -1 });
        res.json(resources);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching resources' });
    }
});

// @route   POST /api/resources
// @desc    Create a new resource
// @access  Admin
router.post('/', protect, admin, async (req, res) => {
    try {
        const resource = await Resource.create(req.body);
        res.status(201).json(resource);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   DELETE /api/resources/:id
// @desc    Delete a resource
// @access  Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const resource = await Resource.findByIdAndDelete(req.params.id);
        if (!resource) return res.status(404).json({ message: 'Resource not found' });
        res.json({ message: 'Resource removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
