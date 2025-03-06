import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Service, Appointment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckIcon, XIcon, ClockIcon, LogOutIcon } from "lucide-react";
import { useLocation } from "wouter";
import * as z from 'zod';

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

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/provider"] });
      toast({
        title: "Success",
        description: "Appointment status updated",
      });
    },
  });

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

        <Tabs defaultValue="appointments">
          <TabsList className="mb-8">
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appointments?.map((appointment) => (
                <Card key={appointment.id}>
                  <CardHeader>
                    <CardTitle>
                      Appointment #{appointment.id}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">
                      {new Date(appointment.startTime).toLocaleString()}
                    </p>
                    <p className="mb-4">
                      Status: {appointment.status}
                    </p>
                    <div className="flex gap-2">
                      {appointment.status === "pending" && (
                        <>
                          <Button
                            onClick={() =>
                              updateAppointmentMutation.mutate({
                                id: appointment.id,
                                status: "accepted",
                              })
                            }
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <CheckIcon className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            onClick={() =>
                              updateAppointmentMutation.mutate({
                                id: appointment.id,
                                status: "declined",
                              })
                            }
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
                          onClick={() =>
                            updateAppointmentMutation.mutate({
                              id: appointment.id,
                              status: "completed",
                            })
                          }
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <CheckIcon className="h-4 w-4" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4" />
                            <span>{service.duration} mins</span>
                          </div>
                          <div className="font-bold">
                            ${service.price.toString()}
                          </div>
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
        </Tabs>
      </div>
    </div>
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
      let imageUrl = data.imageUrl;

      if (data.imageFile) {
        const uploadResult = await uploadImageMutation.mutateAsync(data.imageFile);
        imageUrl = uploadResult.url;
      }

      const serviceData = {
        ...data,
        imageUrl,
      };
      delete serviceData.imageFile;

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
                <Input type="number" {...field} />
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
                <Input type="number" step="0.01" {...field} />
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

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Or Image URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://..." />
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