package com.agrishare.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "bookings")
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @ManyToOne(optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider;

    @ManyToOne
    @JoinColumn(name = "equipment_id")
    private Equipment equipment;

    @ManyToOne
    @JoinColumn(name = "labour_group_id")
    private LabourGroup labourGroup;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected Booking() {}

    public Booking(User farmer, Provider provider, Equipment equipment,
                   LocalDate startDate, LocalDate endDate, BigDecimal totalPrice) {
        this(farmer, provider, equipment, null, startDate, endDate, totalPrice);
    }

    public Booking(User farmer, Provider provider, Equipment equipment, LabourGroup labourGroup,
                   LocalDate startDate, LocalDate endDate, BigDecimal totalPrice) {
        this.farmer = farmer;
        this.provider = provider;
        this.equipment = equipment;
        this.labourGroup = labourGroup;
        this.startDate = startDate;
        this.endDate = endDate;
        this.totalPrice = totalPrice;
    }

    public Long getId() { return id; }
    public User getFarmer() { return farmer; }
    public Provider getProvider() { return provider; }
    public Equipment getEquipment() { return equipment; }
    public LabourGroup getLabourGroup() { return labourGroup; }
    public BookingStatus getStatus() { return status; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public void setStatus(BookingStatus status) { this.status = status; }
}
