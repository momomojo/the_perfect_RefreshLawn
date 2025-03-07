import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Service, Appointment, WeeklySchedule, BlockedDate, BreakTime, Waitlist } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, insertWeeklyScheduleSchema, insertBlockedDateSchema, insertBreakTimeSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckIcon, XIcon, ClockIcon, LogOutIcon, CalendarIcon, Clock, X, PlayIcon, PauseIcon, CalendarIcon as CalendarIcon2, MapPinIcon, AlertCircle, Settings as SettingsIcon } from "lucide-react";
import { useLocation } from "wouter";
import * as z from 'zod';
import { format } from "date-fns";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export default function ProviderDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services/provider"],
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/provider"],
  });

  const { data: breakTimes } = useQuery<BreakTime[]>({
    queryKey: ["/api/break-times"],
  });

  const { data: waitlistEntries } = useQuery<Waitlist[]>({
    queryKey: ["/api/waitlist/service"],
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}/status`, { status, notes });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both provider and customer appointment queries to ensure sync
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/provider"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/customer"] });
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

  const clearCustomerHistoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/appointments/clear-customer-history");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to clear history");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/provider"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/customer"] });
      toast({
        title: "Success",
        description: data.message || "Appointment history cleared from customer view",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteAppointmentHistoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/appointments/delete-history");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete history");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/provider"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/customer"] });
      toast({
        title: "Success",
        description: data.message || "Appointment history permanently deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/auth");
  };

  // Filter and sort appointments
  const pendingAppointments = appointments?.filter(
    app => app.status === "pending"
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) || [];

  const activeAppointments = appointments?.filter(
    app => ["accepted", "confirmed", "in_progress"].includes(app.status)
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) || [];

  const completedAppointments = appointments?.filter(
    app => app.status === "completed"
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) || [];

  const cancelledAppointments = appointments?.filter(
    app => ["cancelled", "declined"].includes(app.status)
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) || [];

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
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="breaks">Break Times</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="settings">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Settings
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <div className="space-y-8">
              {/* Pending Appointments */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Pending Appointments</h2>
                {pendingAppointments.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        updateStatus={updateAppointmentMutation.mutate}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No pending appointments</p>
                )}
              </div>

              {/* Active Appointments */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Active Appointments</h2>
                {activeAppointments.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        updateStatus={updateAppointmentMutation.mutate}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No active appointments</p>
                )}
              </div>

              {/* Completed Appointments */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Completed Appointments</h2>
                {completedAppointments.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        updateStatus={updateAppointmentMutation.mutate}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No completed appointments</p>
                )}
              </div>

              {/* Cancelled/Declined Appointments */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Cancelled & Declined Appointments</h2>
                {cancelledAppointments.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cancelledAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        updateStatus={updateAppointmentMutation.mutate}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No cancelled appointments</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="services">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-6">Your Services</h2>
                <div className="grid gap-6">
                  {services?.map((service) => (
                    <Card key={service.id}>
                      <CardContent className="pt-6">
                        <img
                          src={service.imageUrl}
                          alt={service.title}
                          className="rounded-lg mb-4 w-full aspect-video object-cover"
                        />
                        <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                        <p className="text-muted-foreground mb-2">
                          {service.description}
                        </p>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4" />
                            <span>{service.duration} mins</span>
                          </div>
                          <div className="font-bold">
                            ${service.price.toString()}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Buffer Time: {service.bufferTime || 0} mins</p>
                          <p>Max Daily Bookings: {service.maxDailyBookings || 'Unlimited'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-6">Add New Service</h2>
                <CreateServiceForm />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-6">Weekly Schedule</h2>
                <WeeklyScheduleManager />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-6">Blocked Dates</h2>
                <BlockedDatesManager />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="breaks">
            <div>
              <h2 className="text-2xl font-bold mb-6">Break Times</h2>
              <BreakTimesManager />
            </div>
          </TabsContent>

          <TabsContent value="waitlist">
            <div>
              <h2 className="text-2xl font-bold mb-6">Waitlist Management</h2>
              <WaitlistManager />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Appointment History Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Clear Customer View History</h3>
                    <p className="text-muted-foreground mb-4">
                      This will hide completed, cancelled, and declined appointments from customer dashboards.
                      The history will still be visible in your provider dashboard.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">Clear Customer History</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear Customer Appointment History</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will hide all completed, cancelled, and declined appointments from customer dashboards.
                            This action cannot be undone, but the history will remain visible in your provider dashboard.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => clearCustomerHistoryMutation.mutate()}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Clear History
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Delete All Appointment History</h3>
                    <p className="text-muted-foreground mb-4">
                      This will permanently delete all completed, cancelled, and declined appointments.
                      This action cannot be undone and will remove the history from both customer and provider views.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete All History</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete All Appointment History</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all completed, cancelled, and declined appointments from the database.
                            This action cannot be undone and will remove the history from both customer and provider views.
                            Active appointments will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAppointmentHistoryMutation.mutate()}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// New AppointmentCard component for better organization
interface AppointmentCardProps {
  appointment: Appointment;
  updateStatus: (params: { id: number; status: string; notes?: string }) => void;
}

function AppointmentCard({ appointment, updateStatus }: AppointmentCardProps) {
  return (
    <Card key={appointment.id}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {new Date(appointment.startTime).toLocaleString()}
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

          <div>
            <p className="font-medium">Status:</p>
            <span
              className={`inline-block px-2 py-1 rounded-full text-sm ${
                appointment.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : appointment.status === "accepted"
                  ? "bg-blue-100 text-blue-800"
                  : appointment.status === "confirmed"
                  ? "bg-purple-100 text-purple-800"
                  : appointment.status === "in_progress"
                  ? "bg-orange-100 text-orange-800"
                  : appointment.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </span>
          </div>

          {appointment.recurring && (
            <div>
              <p className="font-medium">Recurring:</p>
              <p className="text-sm text-muted-foreground">
                {appointment.recurringInterval}
                <br />
                Next Date: {new Date(appointment.nextRecurringDate!).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {appointment.status === "pending" && (
              <>
                <Button
                  onClick={() => updateStatus({ id: appointment.id, status: "accepted" })}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <CheckIcon className="h-4 w-4" />
                  Accept
                </Button>
                <Button
                  onClick={() => updateStatus({ id: appointment.id, status: "declined" })}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <XIcon className="h-4 w-4" />
                  Decline
                </Button>
              </>
            )}

            {appointment.status === "accepted" && (
              <Button
                onClick={() => updateStatus({ id: appointment.id, status: "confirmed" })}
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckIcon className="h-4 w-4" />
                Confirm Arrival
              </Button>
            )}

            {appointment.status === "confirmed" && (
              <Button
                onClick={() => updateStatus({ id: appointment.id, status: "in_progress" })}
                size="sm"
                className="flex items-center gap-2"
              >
                <PlayIcon className="h-4 w-4" />
                Start Service
              </Button>
            )}

            {appointment.status === "in_progress" && (
              <Button
                onClick={() => updateStatus({ id: appointment.id, status: "completed" })}
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckIcon className="h-4 w-4" />
                Complete Service
              </Button>
            )}

            {["accepted", "confirmed"].includes(appointment.status) && (
              <Button
                onClick={() => updateStatus({ id: appointment.id, status: "cancelled" })}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
              >
                <XIcon className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateServiceForm() {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(
      insertServiceSchema.extend({
        imageFile: z.instanceof(File).optional(),
      })
    ),
    defaultValues: {
      title: "",
      description: "",
      duration: 60, // Default duration in minutes
      price: "0", // Changed to string type to match the schema expectation
      imageUrl: "",
      bufferTime: 0,
      maxDailyBookings: 0,
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload image');
      return res.json();
    }
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      let imageUrl = "";

      if (data.imageFile) {
        const uploadResult = await uploadImageMutation.mutateAsync(data.imageFile);
        imageUrl = uploadResult.url;
      } else {
        throw new Error('Please upload an image for your service');
      }

      // Ensure numeric fields are properly formatted
      const serviceData = {
        title: data.title,
        description: data.description,
        duration: Number(data.duration),
        price: data.price, // Keep as string as that's what the schema expects
        imageUrl,
        bufferTime: Number(data.bufferTime),
        maxDailyBookings: Number(data.maxDailyBookings),
      };

      const res = await apiRequest("POST", "/api/services", serviceData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/provider"] });
      form.reset();
      toast({
        title: "Success",
        description: "Service created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create service: " + error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => createServiceMutation.mutate(data))}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price ($)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bufferTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Buffer Time (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxDailyBookings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Daily Bookings</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageFile"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onChange(file);
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={createServiceMutation.isPending}
        >
          Create Service
        </Button>
      </form>
    </Form>
  );
}

function WeeklyScheduleManager() {
  const { toast } = useToast();
  const daysOfWeek = [
    { label: "Sunday", value: "0" },
    { label: "Monday", value: "1" },
    { label: "Tuesday", value: "2" },
    { label: "Wednesday", value: "3" },
    { label: "Thursday", value: "4" },
    { label: "Friday", value: "5" },
    { label: "Saturday", value: "6" },
  ];

  const { data: weeklySchedules, isLoading } = useQuery<WeeklySchedule[]>({
    queryKey: ["/api/weekly-schedules"],
  });

  const form = useForm({
    resolver: zodResolver(insertWeeklyScheduleSchema),
    defaultValues: {
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true
    }
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/weekly-schedules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-schedules"] });
      form.reset({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: true
      });
      toast({
        title: "Success",
        description: "Weekly schedule created successfully",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/weekly-schedules/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-schedules"] });
      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/weekly-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-schedules"] });
      toast({
        title: "Success",
        description: "Schedule deleted successfully",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => createScheduleMutation.mutate(data))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="dayOfWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Day of Week</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isAvailable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Available</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={createScheduleMutation.isPending}
          >
            Add Schedule
          </Button>
        </form>
      </Form>

      <div>
        <h3 className="text-lg font-medium mb-3">Your Weekly Schedule</h3>
        {isLoading ? (
          <p>Loading schedules...</p>
        ) : weeklySchedules && weeklySchedules.length > 0 ? (
          <div className="space-y-4">
            {weeklySchedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {daysOfWeek.find(d => parseInt(d.value) === schedule.dayOfWeek)?.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.startTime} - {schedule.endTime}
                      </p>
                      <p className="text-sm">
                        {schedule.isAvailable ? "Available" : "Unavailable"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateScheduleMutation.mutate({
                            id: schedule.id,
                            data: { isAvailable: !schedule.isAvailable }
                          });
                        }}
                      >
                        {schedule.isAvailable ? "Mark Unavailable" : "Mark Available"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No schedules set up yet.</p>
        )}
      </div>
    </div>
  );
}

function BlockedDatesManager() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { data: blockedDates, isLoading } = useQuery<BlockedDate[]>({
    queryKey: ["/api/blocked-dates"],
  });

  const form= useForm({
    resolver: zodResolver(
      insertBlockedDateSchema.extend({
                date: z.date(),
      })
    ),
    defaultValues: {
      isFullDay: true,
      startTime: "09:00",
      endTime: "17:00",
    }
  });

  const createBlockedDateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Format date as ISO string for backend
      const formattedData = {
        ...data,
        date: data.date.toISOString().split('T')[0],
      };
      const res = await apiRequest("POST", "/api/blocked-dates", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
      form.reset({
        isFullDay: true,
        startTime: "09:00",
        endTime: "17:00",
      });
      setSelectedDate(undefined);
      toast({
        title: "Success",
        description: "Blocked date added successfully",
      });
    },
  });

  const deleteBlockedDateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/blocked-dates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
      toast({
        title: "Success",
        description: "Blocked date removed successfully",
      });
    },
  });

  // Monitor changes on the selectedDate
  useEffect(() => {
    if (selectedDate) {
      form.setValue("date", selectedDate);
    }
  }, [selectedDate, form]);

  const isFullDay = form.watch("isFullDay");

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => createBlockedDateMutation.mutate(data))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Select Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={!field.value ? "text-muted-foreground" : ""}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon2 className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Vacation, Holiday, etc." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isFullDay"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Full Day</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {!isFullDay && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={createBlockedDateMutation.isPending || !form.getValues("date")}
          >
            Block Date
          </Button>
        </form>
      </Form>

      <div>        <h3 className="text-lg font-medium mb-3">Your Blocked Dates</h3>
        {isLoading ? (
          <p>Loading blocked dates...</p>        ) : blockedDates && blockedDates.length > 0 ? (
          <div className="space-y-4">
            {blockedDates.map((blockedDate) => (
              <Card key={blockedDate.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {new Date(blockedDate.date).toLocaleDateString()}
                      </p>
                      {!blockedDate.isFullDay && (
                        <p className="text-sm text-muted-foreground">
                          {blockedDate.startTime} - {blockedDate.endTime}
                        </p>
                      )}
                      {blockedDate.reason && (
                        <p className="text-sm text-muted-foreground">{blockedDate.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBlockedDateMutation.mutate(blockedDate.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No blocked dates set up yet.</p>
        )}
      </div>
    </div>
  );
}

function BreakTimesManager() {
  const { toast } = useToast();
  const daysOfWeek = [
    { label: "Sunday", value: "0" },
    { label: "Monday", value: "1" },
    { label: "Tuesday", value: "2" },
    { label: "Wednesday", value: "3" },
    { label: "Thursday", value: "4" },
    { label: "Friday", value: "5" },
    { label: "Saturday", value: "6" },
  ];

  const { data: breakTimes, isLoading } = useQuery<BreakTime[]>({
    queryKey: ["/api/break-times"],
  });

  const form = useForm({
    resolver: zodResolver(insertBreakTimeSchema),
    defaultValues: {
      dayOfWeek: 1,
      startTime: "12:00",
      endTime: "13:00",
      reason: "Lunch Break"
    }
  });

  const createBreakTimeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/break-times", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/break-times"] });
      form.reset();
      toast({
        title: "Success",
        description: "Break time added successfully",
      });
    },
  });

  const deleteBreakTimeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/break-times/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/break-times"] });
      toast({
        title: "Success",
        description: "Break time deleted successfully",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => createBreakTimeMutation.mutate(data))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="dayOfWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Day of Week</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Lunch Break" />
                </FormControl>
                <FormMessage />              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={createBreakTimeMutation.isPending}
          >
            Add Break Time
          </Button>
        </form>
      </Form>

      <div>
        <h3 className="text-lg font-medium mb-3">Your Break Times</h3>
        {isLoading ? (
          <p>Loading break times...</p>
        ) : breakTimes && breakTimes.length > 0 ? (
          <div className="space-y-4">
            {breakTimes.map((breakTime) => (
              <Card key={breakTime.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {daysOfWeek.find(d => parseInt(d.value) === breakTime.dayOfWeek)?.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {breakTime.startTime} - {breakTime.endTime}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {breakTime.reason}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBreakTimeMutation.mutate(breakTime.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No break times set up yet.</p>
        )}
      </div>
    </div>
  );
}

function WaitlistManager() {
  const { toast } = useToast();

  const { data: waitlistEntries, isLoading } = useQuery<Waitlist[]>({
    queryKey: ["/api/waitlist/service"],
  });

  const updateWaitlistStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "fulfilled" | "expired" }) => {
      const res = await apiRequest("PATCH", `/api/waitlist/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist/service"] });
      toast({
        title: "Success",
        description: "Waitlist entry updated successfully",
      });
    },
  });

  return (
    <div className="space-y-6">
      {isLoading ? (
        <p>Loading waitlist entries...</p>
      ) : waitlistEntries && waitlistEntries.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {waitlistEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <p className="font-medium">
                    Preferred Date: {new Date(entry.preferredDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Time Preference: {entry.preferredTimeRange}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {entry.status}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateWaitlistStatusMutation.mutate({
                          id: entry.id,
                          status: "fulfilled",
                        })
                      }
                      disabled={entry.status !== "active"}
                    >
                      Mark Fulfilled
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateWaitlistStatusMutation.mutate({
                          id: entry.id,
                          status: "expired",
                        })
                      }
                      disabled={entry.status !== "active"}
                    >
                      Mark Expired
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p>No waitlist entries found.</p>
      )}
    </div>
  );
}