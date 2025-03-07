import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Service, Appointment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CalendarIcon, ClockIcon, LogOutIcon, MapPinIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function CustomerDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/customer"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-purple-100 text-purple-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
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

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/auth");
  };

  // Filter and sort appointments
  const activeAppointments = appointments?.filter(
    app => !["cancelled", "declined", "completed"].includes(app.status)
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) || [];

  const pastAppointments = appointments?.filter(
    app => ["completed", "cancelled", "declined"].includes(app.status)
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) || [];

  console.log("Customer Appointments:", appointments); // Debug log

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

        <Tabs defaultValue="appointments">
          <TabsList className="mb-8">
            <TabsTrigger value="appointments">My Appointments</TabsTrigger>
            <TabsTrigger value="services">Available Services</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <div className="space-y-8">
              {isLoadingAppointments ? (
                <div>Loading appointments...</div>
              ) : (
                <>
                  {/* Active Appointments */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
                    {activeAppointments.length > 0 ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeAppointments.map((appointment) => (
                          <Card key={appointment.id}>
                            <CardContent className="p-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>
                                    {format(new Date(appointment.startTime), "PPP p")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPinIcon className="h-4 w-4" />
                                  <span>{appointment.address}</span>
                                </div>
                                {appointment.specialInstructions && (
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-1" />
                                    <span className="text-sm">{appointment.specialInstructions}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                                      appointment.status
                                    )}`}
                                  >
                                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                  </span>
                                  <span className="font-bold">
                                    ${Number(appointment.totalAmount).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No upcoming appointments</p>
                    )}
                  </div>

                  {/* Past Appointments */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Past & Cancelled Appointments</h2>
                    {pastAppointments.length > 0 ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pastAppointments.map((appointment) => (
                          <Card key={appointment.id} className="opacity-75">
                            <CardContent className="p-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>
                                    {format(new Date(appointment.startTime), "PPP p")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPinIcon className="h-4 w-4" />
                                  <span>{appointment.address}</span>
                                </div>
                                {appointment.specialInstructions && (
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-1" />
                                    <span className="text-sm">{appointment.specialInstructions}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                                      appointment.status
                                    )}`}
                                  >
                                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                  </span>
                                  <span className="font-bold">
                                    ${Number(appointment.totalAmount).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No past appointments</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

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
                      <div className="font-bold">${Number(service.price).toFixed(2)}</div>
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
        </Tabs>
      </div>
    </div>
  );
}