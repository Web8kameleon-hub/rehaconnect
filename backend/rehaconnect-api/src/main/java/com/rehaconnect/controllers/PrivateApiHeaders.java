package com.rehaconnect.controllers;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
@Component
public class PrivateApiHeaders extends OncePerRequestFilter {
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
        if(request.getRequestURI().startsWith("/api/")){response.setHeader("Cache-Control","no-store");response.setHeader("X-Content-Type-Options","nosniff");}
        chain.doFilter(request,response);
    }
}
