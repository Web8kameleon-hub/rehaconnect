package com.rehaconnect.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Existing Lightning email and Stripe return paths resolve to the RehaConnect UI. */
@Controller
public class PortalRoutes {
    @GetMapping({"/account", "/dashboard"})
    public String portal() { return "forward:/index.html"; }
}
