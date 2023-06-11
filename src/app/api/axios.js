import axios from 'axios';
import config from 'app/store/config';

const axiosInstance = axios.create();

axiosInstance.interceptors.request.use(
  (requestConfig) => {
    const token = config.get('session.token');
    requestConfig.headers.Authorization = `Bearer ${token}`;
    return requestConfig;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default axiosInstance;
