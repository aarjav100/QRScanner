const express = require('express');
const QRCode = require('../models/QRCode');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all QR codes for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, search, favorite } = req.query;
    const query = { userId: req.user._id };

    // Add filters
    if (type && type !== 'all') {
      query.type = type;
    }

    if (favorite === 'true') {
      query.isFavorite = true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const qrCodes = await QRCode.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await QRCode.countDocuments(query);

    res.json({
      success: true,
      data: qrCodes,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get QR codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching QR codes'
    });
  }
});

// Create new QR code
router.post('/', auth, async (req, res) => {
  try {
    const qrCodeData = {
      ...req.body,
      userId: req.user._id
    };

    const qrCode = new QRCode(qrCodeData);
    await qrCode.save();

    res.status(201).json({
      success: true,
      message: 'QR code created successfully',
      data: qrCode
    });
  } catch (error) {
    console.error('Create QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating QR code'
    });
  }
});

// Get single QR code
router.get('/:id', auth, async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    res.json({
      success: true,
      data: qrCode
    });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching QR code'
    });
  }
});

// Update QR code
router.put('/:id', auth, async (req, res) => {
  try {
    const qrCode = await QRCode.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    res.json({
      success: true,
      message: 'QR code updated successfully',
      data: qrCode
    });
  } catch (error) {
    console.error('Update QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating QR code'
    });
  }
});

// Delete QR code
router.delete('/:id', auth, async (req, res) => {
  try {
    const qrCode = await QRCode.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    console.error('Delete QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting QR code'
    });
  }
});

// Delete all QR codes for user
router.delete('/', auth, async (req, res) => {
  try {
    const result = await QRCode.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: `${result.deletedCount} QR codes deleted successfully`
    });
  } catch (error) {
    console.error('Delete all QR codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting QR codes'
    });
  }
});

// Toggle favorite status
router.patch('/:id/favorite', auth, async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    qrCode.isFavorite = !qrCode.isFavorite;
    await qrCode.save();

    res.json({
      success: true,
      message: `QR code ${qrCode.isFavorite ? 'added to' : 'removed from'} favorites`,
      data: qrCode
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating favorite status'
    });
  }
});

// Get QR code statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await QRCode.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCount = await QRCode.countDocuments({ userId: req.user._id });
    const favoriteCount = await QRCode.countDocuments({ 
      userId: req.user._id, 
      isFavorite: true 
    });

    res.json({
      success: true,
      data: {
        total: totalCount,
        favorites: favoriteCount,
        byType: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

module.exports = router;