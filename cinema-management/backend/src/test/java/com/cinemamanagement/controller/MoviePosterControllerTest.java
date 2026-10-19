package com.cinemamanagement.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class MoviePosterControllerTest {
    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final MoviePosterController controller = new MoviePosterController(builder.build());

    @Test
    void returnsImageWithBrowserCacheHeaders() {
        byte[] image = new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff};
        server.expect(requestTo("https://image.tmdb.org/t/p/w500/poster.jpg"))
                .andRespond(withSuccess(image, MediaType.IMAGE_JPEG));

        var response = controller.getPoster("poster.jpg");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(image);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_JPEG);
        assertThat(response.getHeaders().getCacheControl()).contains("max-age=86400", "public");
        server.verify();
    }

    @Test
    void rejectsUrlsAndPathTraversalWithoutMakingAnUpstreamRequest() {
        for (String name : new String[]{"https://example.com/a.jpg", "../a.jpg", "poster.svg", "a.jpg?url=other"}) {
            assertThat(controller.getPoster(name).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
        server.verify();
    }

    @Test
    void upstreamFailureAllowsFrontendToUseFallback() {
        server.expect(requestTo("https://image.tmdb.org/t/p/w500/missing.jpg"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThat(controller.getPoster("missing.jpg").getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        server.verify();
    }

    @Test
    void doesNotServeHtmlAsAnImage() {
        server.expect(requestTo("https://image.tmdb.org/t/p/w500/poster.jpg"))
                .andRespond(withSuccess("<html>error</html>", MediaType.TEXT_HTML));

        assertThat(controller.getPoster("poster.jpg").getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        server.verify();
    }
}
