import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckIcon, XIcon, PlayIcon, PauseIcon } from "lucide-react";
import { format } from "date-fns";

export function AppointmentsManager() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments/provider"],
  });

  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}/status`, { status, notes });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/provider"] });
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update appointment status: " + error.message,
        variant: "destructive"
      });
    }
  });

  const filteredAppointments = appointments.filter(appointment => {
    if (filter === "all") return true;
    if (filter === "active") return ["pending", "accepted", "confirmed", "in_progress"].includes(appointment.status);
    if (filter === "completed") return appointment.status === "completed";
    if (filter === "cancelled") return ["cancelled", "declined"].includes(appointment.status);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6">
        <Button 
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button 
          variant={filter === "active" ? "default" : "outline"}
          onClick={() => setFilter("active")}
        >
          Active
        </Button>
        <Button 
          variant={filter === "completed" ? "default" : "outline"}
          onClick={() => setFilter("completed")}
        >
          Completed
        </Button>
        <Button 
          variant={filter === "cancelled" ? "default" : "outline"}
          onClick={() => setFilter("cancelled")}
        >
          Cancelled
        </Button>
      </div>

      {isLoading ? (
        <div>Loading appointments...</div>
      ) : (
        <div className="grid gap-4">
          {filteredAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      Appointment #{appointment.id}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(appointment.startTime), "PPP p")}
                    </p>
                    <p className="text-sm">{appointment.address}</p>
                    {appointment.specialInstructions && (
                      <p className="text-sm mt-2">
                        Notes: {appointment.specialInstructions}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {appointment.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateAppointmentStatusMutation.mutate({
                              id: appointment.id,
                              status: "accepted"
                            })
                          }
                        >
                          <CheckIcon className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateAppointmentStatusMutation.mutate({
                              id: appointment.id,
                              status: "declined"
                            })
                          }
                        >
                          <XIcon className="h-4 w-4" />
                          Decline
                        </Button>
                      </>
                    )}
                    {appointment.status === "accepted" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateAppointmentStatusMutation.mutate({
                            id: appointment.id,
                            status: "confirmed"
                          })
                        }
                      >
                        Confirm
                      </Button>
                    )}
                    {appointment.status === "confirmed" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateAppointmentStatusMutation.mutate({
                            id: appointment.id,
                            status: "in_progress"
                          })
                        }
                      >
                        <PlayIcon className="h-4 w-4" />
                        Start
                      </Button>
                    )}
                    {appointment.status === "in_progress" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateAppointmentStatusMutation.mutate({
                            id: appointment.id,
                            status: "completed"
                          })
                        }
                      >
                        <PauseIcon className="h-4 w-4" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
