import { useState, useEffect, useRef } from 'react';
import Keycloak from 'keycloak-js';

const useKeycloakAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [keycloak, setKeycloak] = useState<Keycloak.KeycloakInstance | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const isrun = useRef(false)
  useEffect(() => {
    if(isrun.current) return;
    isrun.current = true;
    const keycloakInstance = new Keycloak({
      url: 'http://localhost:8080/',
      realm: 'master',
      clientId: 'react-client',
    });

    keycloakInstance.init({
      onLoad: 'login-required',
      checkLoginIframe: true,
      pkceMethod: 'S256',
    }).then((authenticated) => {
      setIsAuthenticated(authenticated);
      setKeycloak(keycloakInstance);
      setToken(keycloakInstance.token || null);

      if (authenticated) {
        // Handle token expiration and refreshing
        keycloakInstance.onTokenExpired = () => {
          keycloakInstance.updateToken(30).then(refreshed => {
            if (refreshed) {
              console.log('Token refreshed');
              setToken(keycloakInstance.token);
            } else {
              console.warn('Token could not be refreshed');
              handleLogout();
            }
          }).catch(() => {
            console.error('Failed to refresh token');
            handleLogout();
          });
        };
      }
    }).catch((error) => {
      console.error('Keycloak initialization error:', error);
    });
  }, []);

  const handleLogin = () => {
    if (keycloak) {
      keycloak.login();
    }
  };

  const handleLogout = () => {
    if (keycloak) {
      keycloak.logout();
    }
  };

  return {
    isAuthenticated,
    token,
    handleLogin,
    handleLogout,
    keycloak
  };
};

export default useKeycloakAuth;
