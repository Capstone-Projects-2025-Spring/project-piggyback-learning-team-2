import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Signin from './components/Signin';
import Signup from './components/Signup';
import Video from './components/Video';
import PreKPage from './components/PreKPage';
import MousePosition from './components/MousePosition';
import UserProfile from './components/UserProfileDashboard';  
import ResetPassword from './components/ResetPassword'; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/video" element={<Video />} />
        <Route path="/prek" element={<PreKPage />} />
        <Route path="/ms" element={<MousePosition />} />
        <Route path="/profile" element={<UserProfile />} />  
        <Route path="/contact" element={<div>Contact Us</div>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        

        


      </Routes>
    </Router>
  );
}

export default App;
