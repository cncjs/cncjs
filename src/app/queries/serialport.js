import { useQuery } from '@tanstack/react-query';
import controller from '@app/lib/controller';

export const SERIALPORT_PORTS_QUERY_KEY = ['serialport', 'ports'];
export const SERIALPORT_BAUD_RATES_QUERY_KEY = ['serialport', 'baud-rates'];

const callbackQuery = (methodName) => () => new Promise((resolve, reject) => {
  controller[methodName]((error, value) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(value || []);
  });
});

export const useSerialPortsQuery = (options = {}) => useQuery({
  ...options,
  queryKey: SERIALPORT_PORTS_QUERY_KEY,
  queryFn: callbackQuery('getPorts'),
  retry: false,
});

export const useSerialBaudRatesQuery = (options = {}) => useQuery({
  ...options,
  queryKey: SERIALPORT_BAUD_RATES_QUERY_KEY,
  queryFn: callbackQuery('getBaudRates'),
  retry: false,
});
