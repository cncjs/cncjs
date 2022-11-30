const exportFile = (file, data, options) => {
  const dataType = options?.dataType ?? 'text/plain';
  const blob = new Blob([data], {
    type: `${dataType};charset=utf-8;`,
  });

  // IE11 & Edge
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, file);
  } else {
    // In FF link must be added to DOM to be clicked
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', file);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export default exportFile;
