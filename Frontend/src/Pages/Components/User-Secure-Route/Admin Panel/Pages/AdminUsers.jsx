import { useState, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'

import { Api } from '../../../../../backend'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import '../Styles/admin-users.css'

import AdminUser from '../Components/AdminUser'

const AdminUsers = () => {
  const [userData, setuserdata] = useState([])
  const [displayData, setDisplayData] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchUser = async () => {
    setLoading(true)
    const authToken = localStorage.getItem('token')

    const { data } = await axios.get(`${Api}alluser`, {
      withCredentials: true,
      headers: { Authorization: `Bearer ${authToken}` },
    })
    console.log('User data -------------------- ', data.users)
    setuserdata(await data.users)
    setDisplayData(data.users)
    setLoading(false)
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const onSearch = (e) => {
    const searchVal = e.target.value
    if (searchVal === '') {
      setDisplayData(userData)
      return
    }
    const newArr = userData.filter((data) => {
      const name = data.firstName + ' ' + data.lastName
      return data.uid.includes(searchVal) || name.includes(searchVal)
    })
    setDisplayData(newArr)
  }

  return (
    <div className='users-wrapper'>
      <div className='search-input-container'>
        <div className='user-search-box'>
          <input
            type='text'
            placeholder='Search Users by UID or Name... '
            className='search-user-input'
            onChange={(e) => onSearch(e)}
          />
          <FaSearch fill='#d6d6d6' className='user-search-icon' />
        </div>
      </div>
      <div className='users-container'>
        {loading ? (
          <p>Loading...</p>
        ) : displayData.length < 1 || !displayData ? (
          <div className='user-not-found'>
            <h3>No Such User Found!</h3>
            <p>Check Your Spelling</p>
            <p>Enter Correct User Details</p>
          </div>
        ) : (
          displayData.map((user) => <AdminUser key={uuidv4()} user={user} />)
        )}
      </div>
    </div>
  )
}

export default AdminUsers
