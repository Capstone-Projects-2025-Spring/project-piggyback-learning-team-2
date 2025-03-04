import React from 'react'; 
import { useNavigate, Link } from 'react-router-dom';  
import logo from '../images/Mob_Iron_Hog.png'; 
import '../styles/UserProfileDashboard.css';          

function UserProfile() {
    const navigate = useNavigate();

    const user = {
        username: 'Ian Tyler Applebaum',
        bio: 'Learning, creating, and exploring.',
        profilePicture: 'https://avatars.githubusercontent.com/u/9451941?v=4', 
    };

    const handleNavigate = (section) => {
        if (section === 'saved') {
            navigate('/saved-videos');
        } else if (section === 'history') {
            navigate('/video-history');
        } else if (section === 'progress') {
            navigate('/progress');
        }
    };

    return (
        <div className="profile-container">
            {/* Header Navigation */}
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

            {/* Profile Card */}
            <div className="profile-page">
                <div className="profile-card">
                    <div className="profile-header">
                        <img className="profile-picture" src={user.profilePicture} alt="Profile" />
                        <h2>{user.username}</h2>
                        <p>{user.bio}</p>
                    </div>

                    <div className="profile-sections">
                        <button className="profile-section-btn" onClick={() => handleNavigate('saved')}>
                            📁 Saved Videos
                        </button>
                        <button className="profile-section-btn" onClick={() => handleNavigate('history')}>
                            📜 Video History
                        </button>
                        <button className="profile-section-btn" onClick={() => handleNavigate('progress')}>
                            📊 Progress
                        </button>
                    </div>

                    {/* Back to Home */}
                    <button className="back-button" onClick={() => navigate('/')}>
                        ⬅️ Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;
