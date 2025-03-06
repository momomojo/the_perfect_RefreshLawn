import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Service, Appointment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CalendarIcon, ClockIcon } from "lucide-react";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/customer"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F3] p-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-8">Welcome, {user?.name}</h1>

        <Tabs defaultValue="services">
          <TabsList className="mb-8">
            <TabsTrigger value="services">Available Services</TabsTrigger>
            <TabsTrigger value="appointments">My Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services?.map((service) => (
                <Card key={service.id} className="overflow-hidden">
                  <img
                    src={service.imageUrl}
                    alt={service.title}
                    className="w-full aspect-video object-cover"
                  />
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                    <p className="text-muted-foreground mb-4">
                      {service.description}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        <span>{service.duration} mins</span>
                      </div>
                      <div className="font-bold">${service.price.toString()}</div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => setLocation(`/services/${service.id}`)}
                    >
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appointments?.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {new Date(appointment.startTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {appointment.status}
                      </span>
                      <span className="font-bold">
                        ${appointment.totalAmount.toString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
