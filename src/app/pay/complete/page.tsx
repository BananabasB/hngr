'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Check, X } from 'lucide-react';
import { updatePlusMembership } from '@/lib/supabase/services/users';
import { isHngrPlusEnabled } from '@/lib/plus';

const Complete = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentIntentStatus, setPaymentIntentStatus] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membershipUpdated, setMembershipUpdated] = useState(false);
  
  const { user } = useUser();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!isHngrPlusEnabled()) {
      setStatus('complete');
      setPaymentIntentStatus('succeeded');
      setPaymentStatus('paid');
      setText('HNGR+ is free in this beta');
      setLoading(false);
      return;
    }

    if (!sessionId) {
      setError('Payment session is missing');
      setLoading(false);
      return;
    }

    fetch(`/api/stripe/session-status?session_id=${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setStatus(data.status);
        setPaymentIntentId(data.payment_intent_id);
        setPaymentStatus(data.payment_status);
        setPaymentIntentStatus(data.payment_intent_status);

        if (data.status === 'complete') {
          setText('Payment succeeded');
          
          // Update hngr+ membership status
          if (user && !membershipUpdated) {
            updatePlusMembership(user.id, true)
              .then(() => {
                setMembershipUpdated(true);
                console.log('hngr+ membership updated successfully');
              })
              .catch((err) => {
                console.error('Failed to update hngr+ membership:', err);
              });
          }
        } else {
          setText('Something went wrong, please try again.');
        }
      })
      .catch((err) => {
        console.error('Error fetching session status:', err);
        setError('Failed to load payment status. Please try again.');
        setText('Something went wrong, please try again.');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-lg">Loading payment status...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-red-500 text-xl mb-4 flex items-center justify-center gap-2">
          <X size={20} /> Error
        </div>
        <p className="text-muted-foreground">{error}</p>
        <Button asChild>
          <Link href="/pay/checkout">Try Again</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <Card>
        <CardHeader className="text-center flex items-center justify-center gap-2">
          {status === 'complete' ? <Check size={24} className="text-green-600" /> : <X size={24} className="text-red-600" />}
          <h2 className="text-2xl font-bold">{text}</h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Payment Intent ID</TableCell>
                <TableCell className="font-mono text-sm">{paymentIntentId}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>{status}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Payment Status</TableCell>
                <TableCell>{paymentStatus}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Payment Intent Status</TableCell>
                <TableCell>{paymentIntentStatus}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 items-center">
          <Button asChild variant="default">
            <a href={`https://dashboard.stripe.com/payments/${paymentIntentId}`} target="_blank" rel="noopener noreferrer">
              View details
            </a>
          </Button>
          {isHngrPlusEnabled() && (
            <Button asChild variant="link">
              <Link href="/pay/checkout">Test another payment</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Complete;
