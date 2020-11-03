const iframeExport = (url, data, config) => {
  const {
    token,
    method = 'POST',
  } = { ...config };
  const formTarget = 'iframe-downloader';

  if (!document.querySelector(`iframe[id="${formTarget}"]`)) {
    const iframe = document.createElement('iframe');
    iframe.name = formTarget;
    iframe.id = formTarget;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  const form = document.createElement('form');
  form.action = url;
  form.method = method;
  form.enctype = 'multipart/form-data';
  form.target = formTarget;
  form.style.display = 'none';

  if (token) {
    const input = document.createElement('input');
    input.setAttribute('name', 'token');
    input.setAttribute('value', token);
    form.appendChild(input);
  }

  if (data) {
    const input = document.createElement('input');
    input.setAttribute('name', 'json');
    input.setAttribute('value', JSON.stringify(data));
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

export default iframeExport;
