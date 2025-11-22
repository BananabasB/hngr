import { KeyRound, Lock } from 'lucide-react';
import { SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface NotAuthenticatedProps {
  description?: string;
}

export function NotAuthenticated({ 
  description = 'please sign in to continue' 
}: NotAuthenticatedProps) {
  return (
    <div className="flex h-screen items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>you're not authenticated</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <SignInButton>
            <Button><KeyRound />authenticate</Button>
          </SignInButton>
        </EmptyContent>
      </Empty>
    </div>
  );
}

