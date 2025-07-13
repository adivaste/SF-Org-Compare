package tech.adivaste.CodeCompare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"tech.adivaste.CodeCompare", "com.salesforce.codecompare"})
public class CodeCompareApplication {

	public static void main(String[] args) {
		SpringApplication.run(CodeCompareApplication.class, args);
	}

}
