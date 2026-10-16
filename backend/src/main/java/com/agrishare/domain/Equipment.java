package com.agrishare.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "equipment")
public class Equipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider;

    @Column(name = "equipment_type", nullable = false)
    private String equipmentType;

    @Column(name = "equipment_name", nullable = false)
    private String equipmentName;

    @Column(name = "price_per_day", nullable = false)
    private BigDecimal pricePerDay;

    @Column(name = "availability_status", nullable = false)
    private String availabilityStatus = "AVAILABLE";

    protected Equipment() {}

    public Equipment(Provider provider, String equipmentType, String equipmentName,
                     BigDecimal pricePerDay, String availabilityStatus) {
        this.provider = provider;
        this.equipmentType = equipmentType;
        this.equipmentName = equipmentName;
        this.pricePerDay = pricePerDay;
        this.availabilityStatus = availabilityStatus;
    }

    public Long getId() { return id; }
    public Provider getProvider() { return provider; }
    public String getEquipmentType() { return equipmentType; }
    public String getEquipmentName() { return equipmentName; }
    public BigDecimal getPricePerDay() { return pricePerDay; }
    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setEquipmentType(String equipmentType) { this.equipmentType = equipmentType; }
    public void setEquipmentName(String equipmentName) { this.equipmentName = equipmentName; }
    public void setPricePerDay(BigDecimal pricePerDay) { this.pricePerDay = pricePerDay; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }
}
