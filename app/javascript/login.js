document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');

    if (form && form.id === 'login_form') {
      form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent form submission initially

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
          alert('Both username and password are required.');
          return;
        }
      });
    }
  });
  