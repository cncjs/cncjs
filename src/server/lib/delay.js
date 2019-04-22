const delay = (t, v) => new Promise(resolve => {
    setTimeout(resolve.bind(null, v), t);
});

export default delay;
