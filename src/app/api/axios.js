import axios from 'axios';
import config from 'app/store/config';

const token = config.get('session.token');
const axiosInstance = axios.create({
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

export default axiosInstance;
