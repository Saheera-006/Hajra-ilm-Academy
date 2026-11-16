package com.hajara.academy.portal;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/portal")
public class CurriculumController {
    private static final String KEY = "programme.curriculum.v1";
    private final AcademySiteContentRepo repo;
    private final ObjectMapper mapper;
    public CurriculumController(AcademySiteContentRepo repo, ObjectMapper mapper) { this.repo=repo; this.mapper=mapper; }
    @GetMapping("/curriculum")
    public JsonNode get() throws IOException {
        var saved=repo.findAll().stream().filter(x->KEY.equals(x.contentKey)).findFirst();
        if(saved.isPresent()) return mapper.readTree(saved.get().contentValue);
        try(var stream=new ClassPathResource("curriculum-default.json").getInputStream()) { return mapper.readTree(stream); }
    }
    @PutMapping("/admin/curriculum")
    public synchronized JsonNode save(@RequestBody JsonNode data) throws IOException {
        if(!data.isArray() || data.size()!=4) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Exactly four learning areas are required");
        List<String> ids=List.of("quran","aqeedah","fiqh","history");
        // Keep the official four learning areas and enforce bounded, well-formed content.
        for(int i=0;i<4;i++) {
            var area=data.get(i);
            if(!area.isObject() || !area.path("id").asText().equals(ids.get(i)) || !area.path("sections").isArray() || area.path("sections").size()>30)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid learning area or section list");
            for(var section:area.path("sections")) {
                if(!section.path("topics").isArray() || section.path("topics").size()>200)
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid topics");
                for(var topic:section.path("topics")) if(!topic.isArray() || topic.size()!=2 || !topic.get(0).isTextual() || !topic.get(1).isTextual())
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Each topic needs an English title and Tamil description");
            }
        }
        var json=mapper.writeValueAsString(data);
        if(json.length()>400000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Curriculum too large");
        var record=repo.findAll().stream().filter(x->KEY.equals(x.contentKey)).findFirst().orElseGet(AcademySiteContent::new);
        record.contentKey=KEY; record.contentValue=json; repo.save(record);
        return data;
    }
}
