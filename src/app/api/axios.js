import axios from 'axios';
import configStore from 'app/store/config';

const token = configStore.get('session.token');
const axiosInstance = axios.create({
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

export default axiosInstance;
