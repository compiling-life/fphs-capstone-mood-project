const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const User = require('../models/User');

// Get all moods for the current user or teacher
router.get('/', async (req,res)=>{
  try{
    const user = req.user; // From auth middleware
    let moods;
    if(user.role==='teacher'){
      moods = await Mood.find().populate('userId','email role');
    } else {
      moods = await Mood.find({userId: user._id}).sort({date:-1});
    }
    res.json(moods);
  } catch(err){
    console.error(err);
    res.status(500).json({success:false,message:'Server error'});
  }
});
// -
// Submit a new mood
router.post('/', async (req,res)=>{
  try{
    const user = req.user;
    const {className, moodLevel, notes} = req.body;
    if(!className || !moodLevel) return res.status(400).json({success:false,message:'Class and mood required'});

    // Find the period and teacher for that class
    let period='', teacherEmail='';
    if(user.role==='student'){
      const cls = user.selectedClasses.find(c=>c.className===className);
      if(cls){ period=cls.period || ''; teacherEmail=cls.teacherEmail || ''; }
    }

    const mood = new Mood({userId:user._id, className, moodLevel, notes, date:new Date(), period});
    await mood.save();
    res.json({success:true, mood});
  } catch(err){
    console.error(err);
    res.status(500).json({success:false,message:'Server error'});
  }
});

module.exports = router;
