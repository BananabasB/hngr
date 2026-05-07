"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@clerk/nextjs';

export function DebugAuthButton() {
  const { getToken, isSignedIn } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const testAuth = async () => {
    try {
      console.log('Testing authentication...');
      
      // Test 1: Get token from useAuth
      let token: string | null = null;
      try {
        token = await getToken();
        console.log('getToken result:', token ? 'success' : 'failed');
      } catch (error) {
        console.error('getToken error:', error);
      }
      
      // Test 2: Get token from window.Clerk
      let windowToken: string | null = null;
      if (typeof window !== 'undefined' && window.Clerk) {
        try {
          windowToken = await window.Clerk.session.getToken();
          console.log('window.Clerk.session.getToken result:', windowToken ? 'success' : 'failed');
        } catch (error) {
          console.error('window.Clerk error:', error);
        }
      }
      
      // Test 3: Decode JWT to check contents
      const testToken = token || windowToken;
      if (testToken) {
        // Decode JWT payload
        const parts = testToken.split('.');
        const payload = JSON.parse(atob(parts[1]));
        
        console.log('JWT Payload:', payload);
        
        // Test API call with token
        const response = await fetch('/api/debug-auth', {
          headers: {
            'Authorization': `Bearer ${testToken}`,
          },
        });
        
        const authResult = await response.json();
        console.log('Auth API result:', authResult);
        
        // Test JWT decode endpoint
        const jwtResponse = await fetch('/api/debug-jwt', {
          headers: {
            'Authorization': `Bearer ${testToken}`,
          },
        });
        
        const jwtResult = await jwtResponse.json();
        console.log('JWT decode result:', jwtResult);
        
        setDebugInfo({
          jwt_payload: jwtResult,
          auth_test: authResult,
          token_preview: testToken.substring(0, 50) + '...',
        });
      } else {
        setDebugInfo({ error: 'No token available' });
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Debug Authentication</h3>
      <Button onClick={testAuth} disabled={!isSignedIn}>
        Test Auth
      </Button>
      {debugInfo && (
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}
    </div>
  );
}
