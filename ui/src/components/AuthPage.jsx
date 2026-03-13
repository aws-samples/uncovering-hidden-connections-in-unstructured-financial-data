import React, { useState } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Tabs, Tab, CircularProgress
} from '@mui/material';

const AuthPage = ({ cognitoConfig, onAuthenticated }) => {
  const [tab, setTab] = useState(0); // 0=login, 1=register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const userPool = new CognitoUserPool({
    UserPoolId: cognitoConfig.userPoolId,
    ClientId: cognitoConfig.clientId,
  });

  const handleLogin = () => {
    setError('');
    setLoading(true);
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        onAuthenticated(session.getIdToken().getJwtToken());
      },
      onFailure: (err) => {
        setError(err.message || 'Login failed');
        setLoading(false);
      },
    });
  };

  const handleRegister = () => {
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    userPool.signUp(email, password, [new CognitoUserAttribute({ Name: 'email', Value: email })], null, (err) => {
      setLoading(false);
      if (err) {
        setError(err.message || 'Registration failed');
        return;
      }
      setInfo('Registration successful! Check your email for a verification code.');
      setShowVerification(true);
    });
  };

  const handleVerify = () => {
    setError('');
    setLoading(true);
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmRegistration(verificationCode, true, (err) => {
      setLoading(false);
      if (err) {
        setError(err.message || 'Verification failed');
        return;
      }
      setInfo('Email verified! You can now log in.');
      setShowVerification(false);
      setTab(0);
    });
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
      <Card sx={{ width: 420, p: 2 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#FF9900', textAlign: 'center', mb: 3 }}>
            Connections Insights
          </Typography>

          {!showVerification ? (
            <>
              <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }} centered sx={{ mb: 3 }}>
                <Tab label="Sign In" />
                <Tab label="Register" />
              </Tabs>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

              <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} onKeyDown={(e) => e.key === 'Enter' && (tab === 0 ? handleLogin() : handleRegister())} />
              <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }} onKeyDown={(e) => e.key === 'Enter' && (tab === 0 ? handleLogin() : handleRegister())} />

              {tab === 1 && (
                <TextField fullWidth label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} sx={{ mb: 2 }} onKeyDown={(e) => e.key === 'Enter' && handleRegister()} />
              )}

              <Button
                fullWidth variant="contained" disabled={loading || !email || !password}
                onClick={tab === 0 ? handleLogin : handleRegister}
                sx={{ py: 1.5, color: 'white', mt: 1 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : (tab === 0 ? 'Sign In' : 'Register')}
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
                Enter the verification code sent to your email.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

              <TextField fullWidth label="Verification Code" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} sx={{ mb: 2 }} onKeyDown={(e) => e.key === 'Enter' && handleVerify()} />

              <Button fullWidth variant="contained" disabled={loading || !verificationCode} onClick={handleVerify} sx={{ py: 1.5, color: 'white' }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify Email'}
              </Button>
              <Button fullWidth sx={{ mt: 1 }} onClick={() => { setShowVerification(false); setTab(0); }}>
                Back to Sign In
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuthPage;
