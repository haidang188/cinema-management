package com.cinemamanagement.request;

import java.util.List;

public record ReprintTicketsRequest(List<String> ticketCodes) {
}