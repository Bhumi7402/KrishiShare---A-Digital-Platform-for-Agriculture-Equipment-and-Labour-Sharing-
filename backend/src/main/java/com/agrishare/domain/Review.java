package com.agrishare.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "reviews")
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @ManyToOne(optional = false)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @ManyToOne(optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider;

    @Column(nullable = false, precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(length = 1000)
    private String comment;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected Review() {}

    public Review(Booking booking, User farmer, Provider provider, BigDecimal rating, String comment) {
        this.booking = booking;
        this.farmer = farmer;
        this.provider = provider;
        this.rating = rating;
        this.comment = comment;
    }

    public Long getId() { return id; }
    public Booking getBooking() { return booking; }
    public User getFarmer() { return farmer; }
    public Provider getProvider() { return provider; }
    public BigDecimal getRating() { return rating; }
    public String getComment() { return comment; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
