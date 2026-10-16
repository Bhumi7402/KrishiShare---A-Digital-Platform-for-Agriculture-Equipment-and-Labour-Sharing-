package com.agrishare.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "providers")
public class Provider {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "business_name", nullable = false)
    private String businessName;

    @Column(name = "provider_type", nullable = false)
    private String providerType;

    @Column(nullable = false)
    private BigDecimal rating = BigDecimal.ZERO;

    @Column(name = "trust_score", nullable = false)
    private BigDecimal trustScore = BigDecimal.valueOf(50);

    @Column(nullable = false, length = 20)
    private String verificationStatus = "PENDING";

    protected Provider() {}

    public Provider(User user, String businessName, String providerType) {
        this.user = user;
        this.businessName = businessName;
        this.providerType = providerType;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getBusinessName() { return businessName; }
    public String getProviderType() { return providerType; }
    public BigDecimal getRating() { return rating; }
    public BigDecimal getTrustScore() { return trustScore; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
    public void setRating(BigDecimal rating) { this.rating = rating; }
}
