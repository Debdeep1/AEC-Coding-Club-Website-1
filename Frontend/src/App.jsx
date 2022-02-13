import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Home from './Pages/Home'
import Events from './Pages/Events'
import Members from './Pages/Members'
import Signup from './Pages/Signup'
import Signin from './Pages/Signin'
import Otpverify from './Pages/OTP'

import './App.css'

const App = () => {
  return (
    <>
      <Router>
        <Routes>
          <Route exact path='/' element={<Home />} />
          <Route exact path='/events' element={<Events />} />
          <Route exact path='/members' element={<Members />} />
          <Route exact path='/signup' element={<Signup />} />
          <Route exact path='/signin' element={<Signin />} />
          <Route exact path="/verify" element={<Otpverify />} />
          {/* @TODO: add a 404 page */}
        </Routes>
      </Router>
    </>
  )
}

export default App
