import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  Authenticator,
  SelectField,
  ThemeProvider,
  useAuthenticator,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './index.css';
import './aws-config';
import App from './App.jsx';

const formFields = {
  signIn: {
    username: {
      label: 'Email',
      placeholder: 'name@company.com',
      isRequired: true,
    },
  },
  signUp: {
    email: {
      order: 1,
      label: 'Work email',
      placeholder: 'name@company.com',
      isRequired: true,
    },
    password: {
      order: 3,
      label: 'Password',
      placeholder: 'Create a secure password',
      isRequired: true,
    },
    confirm_password: {
      order: 4,
      label: 'Confirm password',
      placeholder: 'Confirm your password',
      isRequired: true,
    },
  },
  confirmSignUp: {
    confirmation_code: {
      label: 'Verification code',
      placeholder: 'Enter the code from your email',
      isRequired: true,
    },
  },
  forgotPassword: {
    username: {
      label: 'Email',
      placeholder: 'name@company.com',
      isRequired: true,
    },
  },
};

const components = {
  Header() {
    return (
      <div className="px-8 pt-8 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-lg font-semibold text-white">
          H
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          HireSphere
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Technical interview simulation for modern hiring teams.
        </p>
      </div>
    );
  },
  SignUp: {
    FormFields() {
      const { validationErrors } = useAuthenticator();

      return (
        <>
          <Authenticator.SignUp.FormFields />
          <SelectField
            errorMessage={validationErrors['custom:profile_type']}
            hasError={!!validationErrors['custom:profile_type']}
            isRequired
            label="Profile Type"
            name="custom:profile_type"
          >
            <option value="">Select profile type</option>
            <option value="Candidate">Candidate</option>
            <option value="Interviewer">Interviewer</option>
          </SelectField>
        </>
      );
    },
  },
};

const services = {
  async validateCustomSignUp(formData) {
    if (!formData['custom:profile_type']) {
      return {
        'custom:profile_type': 'Select a profile type.',
      };
    }

    return undefined;
  },
};

const theme = {
  name: 'hiresphere-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: '#eff6ff',
          80: '#2563eb',
          90: '#1d4ed8',
          100: '#1e40af',
        },
      },
    },
    components: {
      authenticator: {
        router: {
          borderRadius: '0.75rem',
        },
      },
      button: {
        primary: {
          backgroundColor: '{colors.brand.primary.80}',
          _hover: {
            backgroundColor: '{colors.brand.primary.90}',
          },
        },
      },
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Authenticator.Provider>
          <Authenticator
            components={components}
            formFields={formFields}
            loginMechanisms={['email']}
            services={services}
          >
            {({ signOut, user }) => <App signOut={signOut} user={user} />}
          </Authenticator>
        </Authenticator.Provider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
