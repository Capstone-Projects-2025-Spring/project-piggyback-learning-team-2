// npm install react-icons chart.js react-chartjs-2 @supabase/supabase-js react-router-dom

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import logo from '../images/Mob_Iron_Hog.png';
import '../styles/UserProfileDashboard.css';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { FaMoon, FaLightbulb } from 'react-icons/fa';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);


function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [quizStats, setQuizStats] = useState({ total: 0, correct: 0, accuracy: 0 });
  const [quizHistory, setQuizHistory] = useState([]);
  const [videoHistory, setVideoHistory] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [progressStats, setProgressStats] = useState({ saved: 0, watched: 0, percent: 0 });
  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({ first_name: '', last_name: '', bio: '', avatar_url: '' });

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const fetchVideoHistory = async (userId) => {
    const { data, error } = await supabase
      .from('video_history')
      .select('video_url, title, watched_at')
      .eq('user_id', userId)
      .order('watched_at', { ascending: false });
    if (!error) setVideoHistory(data);
  };

  const fetchSavedVideos = async (userId) => {
    const { data, error } = await supabase
      .from('saved_videos')
      .select('video_url, title')
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching saved videos:', error);
      setSavedVideos([]);
    } else {
      setSavedVideos(data ?? []);
    }

    const { data: watchedData = [], error: watchedError } = await supabase
      .from('video_history')
      .select('video_url')
      .eq('user_id', userId);
    if (watchedError) {
      console.error('Error fetching watch history:', watchedError);
    }
    const watchedCount = watchedData?.length || 0;
    const savedCount = data?.length || 0;
    const percent = savedCount === 0 ? 0 : Math.round((watchedCount / savedCount) * 100);
    setProgressStats({ saved: savedCount, watched: watchedCount, percent });
  };

  const fetchQuizStats = async (userId) => {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('video_title, total_questions, correct_answers, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  
    if (error) {
      console.error('Error fetching quiz results:', error.message);
      return;
    }
  
    setQuizHistory(data || []);
  
    const totalQuestions = data.reduce((sum, q) => sum + (q.total_questions || 0), 0);
    const correctAnswers = data.reduce((sum, q) => sum + (q.correct_answers || 0), 0);
    const accuracy = totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100);
  
    setQuizStats({ total: totalQuestions, correct: correctAnswers, accuracy });
  };
  
  const fetchWeeklyQuizActivity = async (userId) => {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('created_at')
      .eq('user_id', userId);
  
    if (error) {
      console.error('Error fetching weekly quiz data:', error.message);
      return [];
    }
  
    const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  
    data.forEach((entry) => {
      const date = new Date(entry.created_at);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      if (dayCounts[dayName] !== undefined) {
        dayCounts[dayName]++;
      }
    });
  
    return dayCounts;
  };
  

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return navigate('/signin');

      let { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, bio')
        .eq('id', user.id)
        .single();

      if (!profileData) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{ 
            id: user.id,
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url || 'https://via.placeholder.com/150',
            bio: 'This is my profile!',
            first_name: user.user_metadata?.full_name?.split(' ')[0] || 'First',
            last_name: user.user_metadata?.full_name?.split(' ')[1] || 'Last'
          }])
          .select()
          .single();
        profileData = newProfile;
      }

      setProfile(profileData);
      setEditValues({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio
      });

      await Promise.all([
        fetchVideoHistory(profileData.id),
        fetchSavedVideos(profileData.id),
        fetchQuizStats(profileData.id),
        fetchWeeklyQuizActivity(profileData.id).then(data => setWeeklyQuizData(data)) // 👈 add this
      ]);
      
      setLoading(false);
    };
    init();
    
  }, [navigate]);

  const [weeklyQuizData, setWeeklyQuizData] = useState({ Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 });


  const handleInputChange = (e) => setEditValues({ ...editValues, [e.target.name]: e.target.value });
  const handleSaveProfile = async () => {
    const { error } = await supabase
      .from('profiles')
      .update(editValues)
      .eq('id', profile.id);
    if (error) return alert('Error updating profile');
    setProfile({ ...profile, ...editValues });
    setEditing(false);
    alert('Profile updated!');
  };
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) navigate('/signin');
  };

  if (loading) return <div className="loading">Loading Profile...</div>;
  if (!profile) return <div className="error">Error loading profile.</div>;

  
  

 
  


  return (
    <div className="profile-container">
      <header className="profile-header-nav">
        <div className="nav-logo">
          <img src={logo} alt="Piggyback Learning Logo" />
        </div>
        <nav className="nav-menu">
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/video">Video (placeholder)</Link></li>
          </ul>
        </nav>
      </header>

      <div className="dark-toggle-wrapper">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="dark-mode-toggle"
          title="Toggle Dark Mode"
        >
          {darkMode ? <FaLightbulb /> : <FaMoon />}
        </button>
      </div>

      <div className="profile-page">
        <div className="profile-card">
          <div className="profile-header">
            <img
              className="profile-picture"
              src={editing ? editValues.avatar_url : profile.avatar_url}
              alt="Profile"
            />

            {editing ? (
              <>
              
                <h2>Edit Your Profile</h2>

                <label>First Name:</label>
                <input
                  name="first_name"
                  value={editValues.first_name}
                  onChange={handleInputChange}
                  placeholder="Enter your first name"
                />

                <label>Last Name:</label>
                <input
                  name="last_name"
                  value={editValues.last_name}
                  onChange={handleInputChange}
                  placeholder="Enter your last name"
                />

                <label>Profile Picture URL:</label>
                <input
                  name="avatar_url"
                  value={editValues.avatar_url}
                  onChange={handleInputChange}
                  placeholder="Paste a public image URL (.jpg/.png)"
                />

                <label>About Me:</label>
                <textarea
                  name="bio"
                  value={editValues.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us something about yourself!"
                />

                <button className="watch-button" onClick={handleSaveProfile}>💾 Save Changes</button>
                <button className="signout-button" onClick={() => setEditing(false)}>❌ Cancel Editing</button>
              </>
            ) : (
              <>
                <h2>{profile.first_name} {profile.last_name}</h2>
                <p>{profile.bio}</p>
                <button className="watch-button" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
              </>
              )}
          </div>



         {/* Saved Videos */}
<div className="profile-sections">
<button className="profile-section-btn" onClick={() => setShowSaved(!showSaved)}>📁 Saved Videos</button>
        {showSaved && (
          <div className="video-scroll-container">
            <div className="video-grid">
              {savedVideos.map((video, idx) => {
                const isWatched = videoHistory.some(v => v.video_url === video.video_url);
                const isYouTube = video.video_url.includes('youtube.com');
                const videoId = isYouTube ? video.video_url.split('/embed/')[1] : null;
                return (
                  <div key={idx} className="video-box">
                    <Link to={`/watch?video=${encodeURIComponent(video.video_url)}&title=${encodeURIComponent(video.title)}`}>
                      <img
                        src={isYouTube ? `https://img.youtube.com/vi/${videoId}/0.jpg` : 'https://img.icons8.com/color/480/video.png'}
                        alt={video.title}
                        width="300" height="180"
                        style={{ borderRadius: '12px', objectFit: 'cover' }}
                      />
                      <p>{video.title}</p>
                    </Link>
                    {isWatched
                      ? <p>✅ Already Watched</p>
                      : <button onClick={async () => {
                          const { data: u } = await supabase.auth.getUser();
                          if (!u?.user) return;
                          const userId = u.user.id;
                          const { data: existing } = await supabase
                          .from('video_history')
                          .select('id')
                          .eq('user_id', userId)
                          .eq('video_url', video.video_url);
                        
                        if (existing && existing.length) return alert('Already marked');
                        
                          await supabase.from('video_history').insert([{ user_id: userId, video_url: video.video_url, title: video.title, watched_at: new Date().toISOString() }]);
                          fetchVideoHistory(userId);
                          setProgressStats(ps => ({ ...ps, watched: ps.watched + 1 }));
                        }}>Mark as Watched</button>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}


            {/* Video History */}
<button className="profile-section-btn" onClick={() => setShowHistory(!showHistory)}>
  📜 Video History
</button>
{showHistory && (
  <div className="video-scroll-container">
    <div className="video-grid">
      {videoHistory.length === 0 ? (
        <p>No video history yet.</p>
      ) : (
        videoHistory.map((video, index) => (
          <div key={index} className="video-box">
            <iframe
              width="300"
              height="180"
              src={video.video_url}
              title={video.title}
              frameBorder="0"
              allowFullScreen
            />
            <p>{video.title}</p>
            <small>Watched on: {new Date(video.watched_at).toLocaleDateString()}</small>
          </div>
        ))
      )}
    </div>
  </div>
)}

{/* 📊 Progress Section */}
<button className="profile-section-btn" onClick={() => setShowProgress(!showProgress)}>
  📊 Progress
</button>

{showProgress && (
  <div className="video-placeholder">
    <h4>📈 Video Stats</h4>
    <p><strong>Videos Saved:</strong> {progressStats.saved}</p>
    <p><strong>Videos Watched:</strong> {progressStats.watched}</p>
    <p><strong>Completion:</strong> {progressStats.percent}%</p>
    <div style={{ width: '300px', margin: '20px auto' }}>
      <Doughnut data={{
        labels: ['Watched', 'Remaining'],
        datasets: [{
          data: [progressStats.watched, progressStats.saved - progressStats.watched],
          backgroundColor: ['#4CAF50', '#E0E0E0'],
          borderWidth: 1
        }]
      }} />
    </div>

    <h4 style={{ marginTop: '30px' }}>🧠 Quiz Stats</h4>
    <p><strong>Total Questions Answered:</strong> {quizStats.total}</p>
    <p><strong>Correct Answers:</strong> {quizStats.correct}</p>
    <p><strong>Accuracy:</strong> {quizStats.accuracy}%</p>
    <div style={{ width: '300px', margin: '20px auto' }}>
      <Doughnut data={{
        labels: ['Correct', 'Incorrect'],
        datasets: [{
          data: [quizStats.correct, quizStats.total - quizStats.correct],
          backgroundColor: ['#4CAF50', '#FF6384'],
          borderWidth: 1
        }]
      }} />
    </div>
    <h4 style={{ marginTop: '30px' }}>📅 Weekly Progress</h4>
<div style={{ width: '500px', margin: '20px auto' }}>
<Bar
  data={{
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Quizzes Taken',
      data: [
        weeklyQuizData.Mon,
        weeklyQuizData.Tue,
        weeklyQuizData.Wed,
        weeklyQuizData.Thu,
        weeklyQuizData.Fri,
        weeklyQuizData.Sat,
        weeklyQuizData.Sun
      ],
      backgroundColor: '#42A5F5',
    }]
  }}
  options={{
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }}
/>

</div>
<h4 style={{ marginTop: '30px' }}>🏆 Achievements</h4>
<ul style={{ listStyle: 'none', padding: 0 }}>
  {progressStats.watched >= 10 && (
    <li>🎉 Watched 10+ videos!</li>
  )}
  {quizStats.correct >= 20 && (
    <li>🎯 Answered 20+ correct questions!</li>
  )}
  {quizStats.accuracy >= 90 && (
    <li>🏆 90%+ Accuracy Master!</li>
  )}
</ul>


    {/* 📝 Recent Quiz Log */}
    {quizHistory.length > 0 && (
      <div className="quiz-log-box" style={{ marginTop: "30px" }}>
        <h4>📝 Recent Quiz Attempts</h4>
        <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
          {quizHistory.slice(0, 5).map((entry, i) => (
            <li key={i} style={{ marginBottom: "10px" }}>
              <strong>{entry.video_title}</strong><br />
              🎯 Questions: {entry.total_questions} | ✅ Correct: {entry.correct_answers}
            </li>
          ))}
        </ul>

      </div>
    )}
  </div>
)}

<button className="back-home-btn" onClick={() => navigate("/")}>
  🏠 Back to Home
</button>


          <button className="signout-button" onClick={handleSignOut}>
            🚪 Sign Out
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default UserProfile;
