import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Service, Appointment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CalendarIcon, ClockIcon, LogOutIcon, CheckCircleIcon, MapPinIcon, FileTextIcon } from "lucide-react";

export default function CustomerDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/customer"],
    // Refresh every 10 seconds to get status updates
    refetchInterval: 10000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "declined":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending Provider Approval";
      case "accepted":
        return "Appointment Accepted";
      case "confirmed":
        return "Provider En Route";
      case "in_progress":
        return "Service in Progress";
      case "completed":
        return "Service Completed";
      case "declined":
        return "Appointment Declined";
      case "cancelled":
        return "Appointment Cancelled";
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
                        {getStatusText(appointment.status)}
                      </span>
                      <span className="font-bold">
                        ${appointment.totalAmount.toString()}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{appointment.address}</span>
                      </div>
                      {appointment.specialInstructions && (
                        <div className="flex items-center gap-2">
                          <FileTextIcon className="h-4 w-4" />
                          <span>{appointment.specialInstructions}</span>
                        </div>
                      )}
                      {appointment.status === "completed" && appointment.completionNotes && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-600">Completion Notes</span>
                          </div>
                          <p>{appointment.completionNotes}</p>
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