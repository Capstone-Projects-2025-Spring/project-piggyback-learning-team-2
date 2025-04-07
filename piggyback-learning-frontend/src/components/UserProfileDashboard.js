// npm install react-icons chart.js react-chartjs-2 @supabase/supabase-js react-router-dom

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import logo from '../images/Mob_Iron_Hog.png';
import '../styles/UserProfileDashboard.css';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { FaMoon, FaLightbulb } from 'react-icons/fa';

ChartJS.register(ArcElement, Tooltip, Legend);

function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    avatar_url: ''
  });

  const [youtubeUrls] = useState([
    { src: "https://www.youtube.com/embed/DR-cfDsHCGA", title: "Introduction to Numbers" },
    { src: "https://www.youtube.com/embed/Yt8GFgxlITs", title: "Counting 1-10" },
    { src: "https://www.youtube.com/embed/tVHOBVAFjUw", title: "Basic Addition" },
    { src: "https://www.youtube.com/embed/o-6OKWU99Co", title: "Learning Shapes" },
    { src: "https://www.youtube.com/embed/qhOTU8_1Af4", title: "Colors and Patterns" },
  ]);

  const [videoHistory, setVideoHistory] = useState([]);
  const [progressStats, setProgressStats] = useState({ saved: 0, watched: 0, percent: 0 });

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

  const calculateProgress = async (userId) => {
    const { data: watched } = await supabase
      .from('video_history')
      .select('video_url')
      .eq('user_id', userId);

    const watchedCount = watched?.length || 0;
    const savedCount = youtubeUrls.length;
    const percent = savedCount === 0 ? 0 : Math.round((watchedCount / savedCount) * 100);

    setProgressStats({ saved: savedCount, watched: watchedCount, percent });
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return navigate('/login');

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
            avatar_url: user.user_metadata?.avatar_url || "https://via.placeholder.com/150",
            bio: "This is my profile!",
            first_name: user.user_metadata?.full_name?.split(" ")[0] || "First",
            last_name: user.user_metadata?.full_name?.split(" ")[1] || "Last"
          }])
          .select()
          .single();
        profileData = newProfile;
      }

      setProfile(profileData);
      setEditValues({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        avatar_url: profileData.avatar_url || '',
        bio: profileData.bio || ''
      });
      fetchVideoHistory(profileData.id);
      calculateProgress(profileData.id);
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editValues.first_name,
        last_name: editValues.last_name,
        bio: editValues.bio,
        avatar_url: editValues.avatar_url
      })
      .eq('id', profile.id);

    if (error) {
      alert("Error updating profile");
    } else {
      alert("Profile updated!");
      setProfile({ ...profile, ...editValues });
      setEditing(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) navigate('/signin');
  };

  const chartData = {
    labels: ['Watched', 'Remaining'],
    datasets: [{
      label: 'Video Progress',
      data: [progressStats.watched, progressStats.saved - progressStats.watched],
      backgroundColor: ['#4CAF50', '#E0E0E0'],
      borderWidth: 1
    }]
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
            <li><Link to="/store">Store</Link></li>
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
                <input name="first_name" value={editValues.first_name} onChange={handleInputChange} />
                <input name="last_name" value={editValues.last_name} onChange={handleInputChange} />
                <input name="avatar_url" value={editValues.avatar_url} onChange={handleInputChange} />
                <textarea name="bio" value={editValues.bio} onChange={handleInputChange} />
                <button className="watch-button" onClick={handleSaveProfile}>💾 Save</button>
                <button className="signout-button" onClick={() => setEditing(false)}>❌ Cancel</button>
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
            <button className="profile-section-btn" onClick={() => setShowSaved(!showSaved)}>
              📁 Saved Videos
            </button>
            {showSaved && (
              <div className="video-scroll-container">
                <div className="video-grid">
                  {youtubeUrls.map((video, index) => {
                    const isWatched = videoHistory.some(v => v.video_url === video.src);
                    return (
                      <div key={index} className="video-box">
                        <iframe width="300" height="180" src={video.src} title={video.title} frameBorder="0" allowFullScreen />
                        <p>{video.title}</p>
                        {isWatched ? (
                          <p>✅ Already Watched</p>
                        ) : (
                          <button className="watch-button" onClick={async () => {
                            const { data: userData } = await supabase.auth.getUser();
                            const userId = userData?.user?.id;
                            if (!userId) return;

                            const { data: existing, error: checkError } = await supabase
                              .from('video_history')
                              .select('id')
                              .eq('user_id', userId)
                              .eq('video_url', video.src);

                            if (checkError) {
                              alert("Failed to check watch status.");
                              return;
                            }

                            if (existing.length > 0) {
                              alert("Already marked as watched.");
                              return;
                            }

                            const { error } = await supabase
                              .from('video_history')
                              .insert([{
                                user_id: userId,
                                video_url: video.src,
                                title: video.title,
                                watched_at: new Date().toISOString()
                              }]);

                            if (error) {
                              alert("Error marking as watched");
                            } else {
                              alert("Marked as watched!");
                              fetchVideoHistory(userId);
                              calculateProgress(userId);
                            }
                          }}>✅ Mark as Watched</button>
                        )}
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
                        <iframe width="300" height="180" src={video.video_url} title={video.title} frameBorder="0" allowFullScreen />
                        <p>{video.title}</p>
                        <small>Watched on: {new Date(video.watched_at).toLocaleDateString()}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Progress Section */}
            <button className="profile-section-btn" onClick={() => setShowProgress(!showProgress)}>
              📊 Progress
            </button>
            {showProgress && (
              <div className="video-placeholder">
                <h4>📈 Progress Stats</h4>
                <p>Videos Saved: {progressStats.saved}</p>
                <p>Videos Watched: {progressStats.watched}</p>
                <p>Completion: {progressStats.percent}%</p>
                <div style={{ width: '300px', margin: '20px auto' }}>
                  <Doughnut data={chartData} />
                </div>
              </div>
            )}
          </div>

          <button className="back-button" onClick={() => navigate('/')}>
            ⬅️ Back to Home
          </button>

          <button className="signout-button" onClick={handleSignOut}>
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
