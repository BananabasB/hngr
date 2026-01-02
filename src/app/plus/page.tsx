'use client';

import { Gupter, Roboto } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Download, Users, Zap, Upload } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export default function HngrPlusPage() {
  const { user, isPlus } = useAuth();

  const features = [
    {
      icon: Download,
      title: "brand-free exports",
      description: "remove hngr branding from all your game exports and simulations"
    },
    {
      icon: Users,
      title: "accept nominations",
      description: "receive and manage nominations from other users for your tribute characters"
    },
    {
      icon: Sparkles,
      title: "Pundit AI",
      description: "gain access to a helpful AI partner that can help you manage your games"
    }
  ];

  const pricing = {
    lifetime: {
      price: "£5",
      period: "one-time payment",
      features: [
        "all premium features forever",
        "no recurring payments",
        "priority support",
        "early access to new features"
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-sidebar-accent">
      {/* Hero Section */}
      <div className="text-center py-16 px-4">
        <div className="flex justify-center mb-6">
          <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
            <Crown className="w-4 h-4 mr-1" />
            Premium Membership
          </Badge>
        </div>
        <h1 className={`${gupter.className} text-4xl md:text-5xl mb-4`}>
          take your experience further
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          unlock the full potential of hngr with a one-time purchase of premium features.
        </p>
        
        {isPlus ? (
          <Card className="max-w-md mx-auto bg-card">
            <CardContent className="p-6 text-center">
              <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-xl font-semibold mb-2">you're a hngr+ member!</h3>
              <p className="text-muted-foreground mb-4">
                enjoy all your premium benefits across the platform.
              </p>
              <Button asChild variant="outline">
                <Link href="/">back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-base px-8">
              <Link href="/pay/checkout">get hngr+</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8">
              <Link href="#pricing">view pricing</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className={`${gupter.className} text-3xl text-center mb-12`}>
            premium features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <feature.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold">{feature.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-16 px-4 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <h2 className={`${gupter.className} text-3xl text-center mb-12`}>
            simple pricing
          </h2>
          <div className="grid md:grid-cols-1 gap-8">
            {/* Lifetime Plan */}
            <Card className="relative border-primary">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                One-Time Payment
              </Badge>
              <CardHeader className="text-center">
                <h3 className={`text-xl font-semibold ${roboto.className}`}>
                  hngr+ lifetime
                </h3>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{pricing.lifetime.price}</span>
                  <span className="text-muted-foreground ml-2">{pricing.lifetime.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pricing.lifetime.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/pay/checkout">get hngr+ now</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className={`${gupter.className} text-3xl text-center mb-12`}>
            frequently asked questions
          </h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">is this a subscription?</h3>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  no, hngr+ is a one-time purchase. pay once and enjoy all premium features forever.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="font-semibold">what happens to my data if i don't upgrade?</h3>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  your tributes, games, and all data remain safe. you'll just miss out on premium features like brand-free exports.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold">how do brand-free exports work?</h3>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  with hngr+, you can export your games and simulations without any hngr branding, perfect for content creators and sharing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}