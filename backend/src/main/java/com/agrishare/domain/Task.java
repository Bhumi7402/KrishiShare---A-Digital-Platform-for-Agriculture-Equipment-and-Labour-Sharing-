package com.agrishare.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "tasks")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @Column(nullable = false)
    private String crop;

    @Column(name = "task_type", nullable = false)
    private String taskType;

    @Column(name = "land_area", nullable = false)
    private BigDecimal landArea;

    @Column(nullable = false)
    private String unit = "ACRE";

    @Column(name = "required_workers")
    private Integer requiredWorkers;

    @Column(name = "required_equipment")
    private String requiredEquipment;

    @Column(name = "preferred_date")
    private LocalDate preferredDate;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected Task() {}

    public Task(User farmer, String crop, String taskType, BigDecimal landArea,
                String unit, Integer requiredWorkers, String requiredEquipment,
                LocalDate preferredDate) {
        this.farmer = farmer;
        this.crop = crop;
        this.taskType = taskType;
        this.landArea = landArea;
        this.unit = unit;
        this.requiredWorkers = requiredWorkers;
        this.requiredEquipment = requiredEquipment;
        this.preferredDate = preferredDate;
    }

    public Long getId() { return id; }
    public User getFarmer() { return farmer; }
    public String getCrop() { return crop; }
    public String getTaskType() { return taskType; }
    public BigDecimal getLandArea() { return landArea; }
    public String getUnit() { return unit; }
    public Integer getRequiredWorkers() { return requiredWorkers; }
    public String getRequiredEquipment() { return requiredEquipment; }
    public LocalDate getPreferredDate() { return preferredDate; }
}
