import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { LeafIcon, CalendarIcon, CreditCardIcon, UserIcon } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: <LeafIcon className="h-6 w-6" />,
      title: "Professional Services",
      description: "Expert lawn care services from verified professionals"
    },
    {
      icon: <CalendarIcon className="h-6 w-6" />,
      title: "Easy Scheduling",
      description: "Book appointments at your convenience"
    },
    {
      icon: <CreditCardIcon className="h-6 w-6" />,
      title: "Secure Payments",
      description: "Safe and hassle-free payment processing"
    },
    {
      icon: <UserIcon className="h-6 w-6" />,
      title: "Verified Providers",
      description: "Trusted and experienced service providers"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F3]">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LeafIcon className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">LawnCare</span>
          </div>
          <div>
            {user ? (
              <Button
                onClick={() => setLocation(
                  user.role === "provider" ? "/provider/dashboard" : "/customer/dashboard"
                )}
              >
                Dashboard
              </Button>
            ) : (
              <Button onClick={() => setLocation("/auth")}>
                Login / Register
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-primary mb-6">
              Professional Lawn Care Services
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Connect with expert lawn care professionals or offer your services.
              Schedule appointments and manage your lawn care needs all in one place.
            </p>
            <Button size="lg" onClick={() => setLocation("/auth")}>
              Get Started
            </Button>
          </div>
          <div>
            <img
              src="https://images.unsplash.com/photo-1584515933487-779824d29309"
              alt="Professional lawn care"
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-6 shadow-lg"
            >
              <div className="text-primary mb-4">{feature.icon}</div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gallery */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <img
            src="https://images.unsplash.com/photo-1515377905703-c4788e51af15"
            alt="Lawn maintenance"
            className="rounded-lg shadow-lg aspect-video object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1502139214982-d0ad755818d8"
            alt="Garden care"
            className="rounded-lg shadow-lg aspect-video object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1527475549522-94b2a376ce13"
            alt="Landscaping"
            className="rounded-lg shadow-lg aspect-video object-cover"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-2">
            <LeafIcon className="h-6 w-6" />
            <span className="text-xl font-bold">LawnCare</span>
          </div>
          <p className="text-center mt-4">
            © 2024 LawnCare. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}