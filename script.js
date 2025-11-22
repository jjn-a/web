  
       const form = document.getElementById('auth-form');
        const title = document.getElementById('form-title');
        const submitBtn = document.getElementById('submit-btn');
        const toggleLink = document.getElementById('toggle-link');
        const emailGroup = document.getElementById('email-group');
        const confirmGroup = document.getElementById('confirm-group');
        const emailInput = document.getElementById('email');
        const confirmInput = document.getElementById('confirm-password');
        let isSignUp = false;
        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
           
            isSignUp = !isSignUp;
            
            if (isSignUp) {
                title.textContent = 'Sign Up';
                submitBtn.textContent = 'Sign Up';
                form.action = '/register';
                emailGroup.style.display = 'block';
                confirmGroup.style.display = 'block';
                emailInput.required = true;
                confirmInput.required = true;
                toggleLink.textContent = 'Already have an account? Sign In';
            } else {
                title.textContent = 'Sign In';
                submitBtn.textContent = 'Sign In';
                form.action = '/login';
                emailGroup.style.display = 'none';
                confirmGroup.style.display = 'none';
                emailInput.required = false;
                confirmInput.required = false;
                toggleLink.textContent = 'Don\'t have an account? Sign Up.';
            }
            
        });
