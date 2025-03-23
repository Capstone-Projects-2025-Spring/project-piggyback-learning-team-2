import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Ensure Supabase is correctly initialized
import logo from '../images/Mob_Iron_Hog.png';
import '../styles/UserProfileDashboard.css';

function UserProfile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);

            // Get authenticated user
            const { data: authData, error: authError } = await supabase.auth.getUser();

            if (authError || !authData?.user) {
                console.error("User not authenticated:", authError);
                navigate('/login');
                return;
            }

            const user = authData.user;
            console.log("Supabase Auth User:", user); // Debugging

            // Check if profile exists in Supabase
            let { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, bio')
    .eq('id', user.id)
    .single();


            if (profileError) {
                console.log("No profile found, creating one...");

                // Insert a new profile into the 'profiles' table
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: user.id,
                            name: user.user_metadata?.full_name || "New User",
                            email: user.email,
                            avatar_url: user.user_metadata?.avatar_url || "https://via.placeholder.com/150", 
                            bio: "This is my profile!"
                        }
                    ])
                    .select('id, name, email, avatar_url, bio') 
                    .single();

                if (insertError) {
                    console.error("Error inserting profile:", insertError);
                } else {
                    profileData = newProfile;
                }
            }

            setProfile(profileData);
            setLoading(false);
        };

        fetchProfile();
    }, [navigate]);

    const handleNavigate = (section) => {
        navigate(`/${section}`);
    };

    if (loading) {
        return <div className="loading">Loading Profile...</div>;
    }

    if (!profile) {
        return <div className="error">Error loading profile.</div>;
    }

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
                        <img 
                            className="profile-picture" 
                            src={profile.avatar_url || "https://via.placeholder.com/150"} 
                            alt="Profile" 
                        />
                        <h2>{profile.name}</h2>
                        <p>{profile.bio}</p>
                    </div>

                    <div className="profile-sections">
                        <button className="profile-section-btn" onClick={() => handleNavigate('saved-videos')}>
                            📁 Saved Videos
                        </button>
                        <button className="profile-section-btn" onClick={() => handleNavigate('video-history')}>
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
