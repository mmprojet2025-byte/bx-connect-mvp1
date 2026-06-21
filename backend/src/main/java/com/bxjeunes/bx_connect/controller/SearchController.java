package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.SearchResult;
import com.bxjeunes.bx_connect.service.SearchService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public List<SearchResult> search(
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(name = "types", required = false) List<String> types,
            @RequestParam(name = "limit", required = false) Integer limit,
            Authentication authentication) {
        return searchService.search(authentication.getName(), query, types, limit);
    }
}
