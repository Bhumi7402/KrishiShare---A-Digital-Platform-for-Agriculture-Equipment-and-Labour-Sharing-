package com.agrishare.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "labour_groups")
public class LabourGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider;

    @Column(name = "group_name", nullable = false)
    private String groupName;

    @Column(name = "worker_count", nullable = false)
    private Integer workerCount;

    @Column(name = "skill_type", nullable = false)
    private String skillType;

    @Column(name = "price_per_day", nullable = false)
    private BigDecimal pricePerDay;

    @Column(name = "availability_status", nullable = false)
    private String availabilityStatus = "AVAILABLE";

    protected LabourGroup() {}

    public LabourGroup(Provider provider, String groupName, Integer workerCount,
                       String skillType, BigDecimal pricePerDay) {
        this.provider = provider;
        this.groupName = groupName;
        this.workerCount = workerCount;
        this.skillType = skillType;
        this.pricePerDay = pricePerDay;
    }

    public Long getId() { return id; }
    public Provider getProvider() { return provider; }
    public String getGroupName() { return groupName; }
    public Integer getWorkerCount() { return workerCount; }
    public String getSkillType() { return skillType; }
    public BigDecimal getPricePerDay() { return pricePerDay; }
    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setGroupName(String groupName) { this.groupName = groupName; }
    public void setWorkerCount(Integer workerCount) { this.workerCount = workerCount; }
    public void setSkillType(String skillType) { this.skillType = skillType; }
    public void setPricePerDay(BigDecimal pricePerDay) { this.pricePerDay = pricePerDay; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }
}
