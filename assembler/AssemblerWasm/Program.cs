using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using AssemblerWasm;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

var app = builder.Build();

// Register interop to ensure assembly is loaded
Startup.RegisterInterop();

await app.RunAsync();
