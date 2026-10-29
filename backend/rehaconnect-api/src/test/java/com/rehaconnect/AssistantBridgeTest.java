package com.rehaconnect;

import com.rehaconnect.controllers.BillingController;
import com.rehaconnect.clients.InternalAuthClient;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

class AssistantBridgeTest {
    @Test void preservesLightningAuthenticationCsrfAndErrors() throws Exception {
        var upstream=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        var calls=new AtomicInteger();
        upstream.createContext("/api/workflow",exchange->{
            calls.incrementAndGet();
            assertEquals("http://127.0.0.1:"+upstream.getAddress().getPort(),exchange.getRequestHeaders().getFirst("Origin"));
            assertEquals("LightningCustomer=test-session",exchange.getRequestHeaders().getFirst("Cookie"));
            boolean post=exchange.getRequestMethod().equals("POST");
            if(post)assertEquals("workspace-csrf",exchange.getRequestHeaders().getFirst("X-CSRF-Token"));
            byte[] body=(post?"{\"error\":\"authentication required\"}":"{\"models\":[]}").getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Set-Cookie","LightningCsrf=test; HttpOnly; Path=/");
            exchange.sendResponseHeaders(post?403:200,body.length);
            exchange.getResponseBody().write(body);exchange.close();
        });
        upstream.start();
        try {
            String base="http://127.0.0.1:"+upstream.getAddress().getPort();
            MockMvc mvc=standaloneSetup(new BillingController(base,"http://127.0.0.1:4103",false,new InternalAuthClient(base))).build();
            mvc.perform(get("/api/assistant").header("Cookie","LightningCustomer=test-session"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().exists("Set-Cookie")).andExpect(jsonPath("$.models").isArray());
            mvc.perform(post("/api/assistant/conversation").contentType("application/json").header("Origin","https://other.example").content("{}"))
                .andExpect(status().isForbidden());
            mvc.perform(post("/api/assistant/execute").contentType("application/json").header("Origin","http://127.0.0.1:4103").content("{}"))
                .andExpect(status().isNotFound());
            mvc.perform(post("/api/assistant/conversation").contentType("application/json").header("Origin","http://127.0.0.1:4103").content("x".repeat(65537)))
                .andExpect(status().isPayloadTooLarge());
            assertEquals(1,calls.get(),"Rejected requests must not reach Lightning");
            mvc.perform(post("/api/assistant/conversation").contentType("application/json").header("Origin","http://127.0.0.1:4103")
                .header("Cookie","LightningCustomer=test-session").header("X-CSRF-Token","workspace-csrf").content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("authentication required"));
            assertEquals(2,calls.get());
            mvc.perform(post("/api/assistant/conversation").contentType("application/json").header("Origin","http://127.0.0.1:4103")
                .header("Cookie","LightningCustomer=test-session").header("X-CSRF-Token","workspace-csrf").content("{\"goal\":\""+"\u6c49".repeat(6000)+"\"}"))
                .andExpect(status().isForbidden());
            assertEquals(3,calls.get(),"Valid multilingual UI messages must reach Lightning");
        } finally {upstream.stop(0);}
    }
    @Test void boundsConcurrentAssistantRequestsAndReleasesCapacity() throws Exception {
        var upstream=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        var workers=java.util.concurrent.Executors.newCachedThreadPool();
        var clients=java.util.concurrent.Executors.newFixedThreadPool(4);
        var entered=new java.util.concurrent.CountDownLatch(4);
        var release=new java.util.concurrent.CountDownLatch(1);
        upstream.setExecutor(workers);
        upstream.createContext("/api/workflow",exchange->{
            entered.countDown();
            try{release.await(10,java.util.concurrent.TimeUnit.SECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();}
            exchange.sendResponseHeaders(200,2);exchange.getResponseBody().write("{}".getBytes(StandardCharsets.UTF_8));exchange.close();
        });
        upstream.start();
        try{
            String base="http://127.0.0.1:"+upstream.getAddress().getPort();
            MockMvc mvc=standaloneSetup(new BillingController(base,"http://127.0.0.1:4103",false,new InternalAuthClient(base))).build();
            var pending=new java.util.ArrayList<java.util.concurrent.Future<?>>();
            for(int i=0;i<4;i++)pending.add(clients.submit(()->{
                try{mvc.perform(get("/api/assistant")).andExpect(status().isOk());}catch(Exception e){throw new RuntimeException(e);}
            }));
            assertTrue(entered.await(5,java.util.concurrent.TimeUnit.SECONDS));
            mvc.perform(get("/api/assistant")).andExpect(status().isTooManyRequests());
            release.countDown();for(var result:pending)result.get(5,java.util.concurrent.TimeUnit.SECONDS);
            mvc.perform(get("/api/assistant")).andExpect(status().isOk());
        }finally{release.countDown();upstream.stop(0);workers.shutdownNow();clients.shutdownNow();}
    }
    @Test void rejectsOversizedBodiesWithoutKnownContentLength(){
        var request=new org.springframework.mock.web.MockHttpServletRequest(){
            @Override public long getContentLengthLong(){return -1;}
        };
        request.setMethod("POST");request.addHeader("Origin","http://127.0.0.1:4103");
        request.setContentType("application/json");request.setContent(new byte[100000]);
        var controller=new BillingController("","http://127.0.0.1:4103",false,new InternalAuthClient(""));
        var error=assertThrows(org.springframework.web.server.ResponseStatusException.class,()->controller.assistant("conversation",request));
        assertEquals(413,error.getStatusCode().value());
    }
}
