import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Service, Appointment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CalendarIcon, ClockIcon, LogOutIcon, MapPinIcon, CheckCircleIcon, PlayCircleIcon } from "lucide-react";

export default function CustomerDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/customer"],
    // Increase polling frequency to get status updates more quickly
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-indigo-100 text-indigo-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "in_progress":
        return <PlayCircleIcon className="h-4 w-4" />;
      case "completed":
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Waiting for provider confirmation";
      case "accepted":
        return "Provider accepted your booking";
      case "confirmed":
        return "Provider is on their way";
      case "in_progress":
        return "Service in progress";
      case "completed":
        return "Service completed";
      case "cancelled":
        return "Service cancelled";
      case "declined":
        return "Service declined by provider";
      default:
        return status;
    }
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-[#F5F7F3] p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOutIcon className="h-4 w-4" />
            Logout
          </Button>
        </div>

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
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(appointment.startTime).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {appointment.address}
                        </span>
                      </div>

                      {appointment.specialInstructions && (
                        <p className="text-sm text-muted-foreground">
                          Special Instructions: {appointment.specialInstructions}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${getStatusColor(
                              appointment.status
                            )}`}
                          >
                            {getStatusIcon(appointment.status)}
                            {getStatusText(appointment.status)}
                          </span>
                        </div>
                        <span className="font-bold">
                          ${appointment.totalAmount.toString()}
                        </span>
                      </div>

                      {appointment.recurring && (
                        <div className="text-sm text-muted-foreground">
                          <p>Recurring: {appointment.recurringInterval}</p>
                          <p>Next Date: {new Date(appointment.nextRecurringDate!).toLocaleDateString()}</p>
                        </div>
                      )}

                      {appointment.completionNotes && (
                        <div className="text-sm border-t pt-2 mt-2">
                          <p className="font-medium">Completion Notes:</p>
                          <p className="text-muted-foreground">{appointment.completionNotes}</p>
                        </div>
                      )}
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