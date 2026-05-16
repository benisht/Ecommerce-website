const http = require('http');

const product = {
  name: "Test Product",
  price: 99.99,
  category: "Test",
  image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  description: "Test Description",
  in_stock: true,
  sizes: ["S", "M"],
  variants: []
};

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response:', data);
    if (res.statusCode === 200) {
      console.log('SUCCESS: Product saved correctly');
      process.exit(0);
    } else {
      console.error('FAILURE: Status ' + res.statusCode);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});

req.write(JSON.stringify(product));
req.end();
